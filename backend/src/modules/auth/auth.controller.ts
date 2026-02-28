import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { HTTP_STATUS } from '../../utils/constants';
import { logger } from '../../utils/logger';

const authService = new AuthService();

export class AuthController {
  /**
   * Register new user
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      logger.info('User registered', { userId: result.user.id, email });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const result = await authService.login({ email, password, ipAddress, userAgent });

      logger.info('User logged in', { userId: result.user.id, email });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const result = await authService.refreshToken({ refreshToken, ipAddress, userAgent });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user!.id;

      await authService.logout({ userId, refreshToken });

      logger.info('User logged out', { userId });

      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getUserById(req.user!.id);

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
