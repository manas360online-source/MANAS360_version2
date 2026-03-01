import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';

interface GenerateTokenInput {
  channelName: string;
  userId: string;
  role?: 'publisher' | 'subscriber';
  expirySeconds?: number;
}

export class AgoraService {
  private appId: string;
  private appCertificate: string;

  constructor() {
    this.appId = env.AGORA_APP_ID || '';
    this.appCertificate = env.AGORA_APP_CERTIFICATE || '';

    if (!this.appId || !this.appCertificate) {
      logger.warn('Agora credentials not configured');
    }
  }

  /**
   * Generate Agora RTC token for video session
   * @param input - Channel and user details
   * @returns Agora token
   */
  generateRtcToken(input: GenerateTokenInput): string {
    try {
      const { channelName, userId, role = 'publisher', expirySeconds = 86400 } = input;

      if (!this.appId || !this.appCertificate) {
        throw new AppError(
          'Agora not configured',
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_ERROR
        );
      }

      // Generate UID from userId (convert to number)
      const uid = this.generateUid(userId);

      // Set role
      const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

      // Calculate expiry timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirySeconds;

      // Build token
      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channelName,
        uid,
        agoraRole,
        privilegeExpiredTs
      );

      logger.info('Agora token generated', {
        channelName,
        userId,
        uid,
        role,
      });

      return token;
    } catch (error: any) {
      logger.error('Failed to generate Agora token', {
        error: error.message,
        input,
      });
      throw new AppError(
        'Failed to generate video token',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Generate channel name for session
   * @param sessionId - Session ID
   * @returns Channel name
   */
  generateChannelName(sessionId: string): string {
    return `manas360_session_${sessionId}`;
  }

  /**
   * Generate numeric UID from string user ID
   * @param userId - User ID string
   * @returns Numeric UID
   */
  private generateUid(userId: string): number {
    // Generate consistent numeric UID from string
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Validate Agora configuration
   * @returns Boolean indicating if configured
   */
  isConfigured(): boolean {
    return !!(this.appId && this.appCertificate);
  }
}

export const agoraService = new AgoraService();
