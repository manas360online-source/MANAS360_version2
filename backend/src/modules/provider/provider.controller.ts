import { Request, Response, NextFunction } from 'express';
import { PrismaClient, VerificationStatus } from '@prisma/client';
import { HTTP_STATUS } from '../../utils/constants';
import { AppError } from '../../middleware/error.middleware';
import { ERROR_CODES } from '../../utils/constants';

const prisma = new PrismaClient();

export class ProviderController {
  /**
   * Get all verified providers (public)
   */
  async getProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const specialization = req.query.specialization as string | undefined;
      const language = req.query.language as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = {
        verificationStatus: VerificationStatus.VERIFIED,
        isAcceptingPatients: true,
      };

      // Filter by specialization
      if (specialization) {
        where.specializations = {
          array_contains: [specialization],
        };
      }

      // Filter by language
      if (language) {
        where.languages = {
          has: language,
        };
      }

      const [providers, total] = await Promise.all([
        prisma.providerProfile.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { ratingAverage: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.providerProfile.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          providers,
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider by ID (public)
   */
  async getProviderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const provider = await prisma.providerProfile.findUnique({
        where: { userId: id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          availability: {
            where: { isActive: true },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });

      if (!provider) {
        throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Only show verified providers publicly
      if (provider.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      res.json({
        success: true,
        data: { provider },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get own provider profile
   */
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const provider = await prisma.providerProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          availability: true,
          documents: true,
        },
      });

      if (!provider) {
        throw new AppError('Provider profile not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      res.json({
        success: true,
        data: { provider },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update provider profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const {
        bio,
        specializations,
        approaches,
        languages,
        sessionRate,
        yearsExperience,
        education,
        certifications,
        isAcceptingPatients,
      } = req.body;

      const provider = await prisma.providerProfile.update({
        where: { userId },
        data: {
          bio,
          specializations,
          approaches,
          languages,
          sessionRate,
          yearsExperience,
          education,
          certifications,
          isAcceptingPatients,
        },
      });

      res.json({
        success: true,
        data: { provider },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider availability
   */
  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const provider = await prisma.providerProfile.findUnique({
        where: { userId },
      });

      if (!provider) {
        throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      const availability = await prisma.providerAvailability.findMany({
        where: { providerId: provider.id },
        orderBy: { dayOfWeek: 'asc' },
      });

      res.json({
        success: true,
        data: { availability },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set provider availability
   */
  async setAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { availability } = req.body;

      const provider = await prisma.providerProfile.findUnique({
        where: { userId },
      });

      if (!provider) {
        throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Delete existing availability
      await prisma.providerAvailability.deleteMany({
        where: { providerId: provider.id },
      });

      // Create new availability
      const created = await prisma.providerAvailability.createMany({
        data: availability.map((slot: any) => ({
          providerId: provider.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive !== false,
        })),
      });

      res.json({
        success: true,
        data: { count: created.count },
        message: 'Availability updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider's sessions
   */
  async getMySessions(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.id;
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = { providerId };
      if (status) {
        where.status = status;
      }

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.session.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          sessions,
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
