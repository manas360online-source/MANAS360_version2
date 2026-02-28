import { PrismaClient, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cryptoUtils } from '../../utils/crypto';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../../utils/constants';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

interface RefreshTokenInput {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export class AuthService {
  /**
   * Register new user
   */
  async register(input: RegisterInput) {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError('User already exists', HTTP_STATUS.CONFLICT, ERROR_CODES.VALIDATION_ERROR);
    }

    // Hash password
    const passwordHash = await cryptoUtils.hashPassword(input.password);

    // Create user and profile in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          phone: input.phone,
          profile: {
            create: {},
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      // Create provider profile if role is therapist/psychiatrist/coach
      if (['THERAPIST', 'PSYCHIATRIST', 'COACH'].includes(input.role)) {
        await tx.providerProfile.create({
          data: {
            userId: newUser.id,
            providerType: input.role as any,
            licenseNumber: '', // To be filled during onboarding
            licenseBody: '',
            languages: [],
            sessionRate: 0,
          },
        });
      }

      // Create patient profile if role is patient
      if (input.role === 'PATIENT') {
        await tx.patientProfile.create({
          data: {
            userId: newUser.id,
          },
        });
      }

      return newUser;
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id, user.email, user.role);

    logger.info('User registered successfully', { userId: user.id });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Verify password
    const isValid = await cryptoUtils.verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      input.ipAddress,
      input.userAgent
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info('User logged in successfully', { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token (with refresh token rotation)
   */
  async refreshToken(input: RefreshTokenInput) {
    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
    }

    // Check if refresh token exists in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: input.refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Refresh token not found', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
    }

    // Check if token is revoked
    if (storedToken.revokedAt) {
      throw new AppError('Refresh token has been revoked', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token expired', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
    }

    // ROTATION: Revoke old refresh token and generate new pair
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokenPair(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
      input.ipAddress,
      input.userAgent
    );

    logger.info('Refresh token rotated', { userId: storedToken.user.id });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user
   */
  async logout(input: { userId: string; refreshToken?: string }) {
    if (input.refreshToken) {
      // Revoke specific refresh token
      await prisma.refreshToken.updateMany({
        where: {
          userId: input.userId,
          token: input.refreshToken,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } else {
      // Revoke all refresh tokens for user
      await prisma.refreshToken.updateMany({
        where: { userId: input.userId },
        data: { revokedAt: new Date() },
      });
    }

    logger.info('User logged out', { userId: input.userId });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    return user;
  }

  /**
   * Generate JWT token pair (access + refresh)
   */
  private async generateTokenPair(
    userId: string,
    email: string,
    role: UserRole,
    ipAddress?: string,
    userAgent?: string
  ) {
    const payload: TokenPayload = {
      userId,
      email,
      role,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    });

    // Store refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken };
  }
}
