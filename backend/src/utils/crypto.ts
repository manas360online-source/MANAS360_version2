import crypto from 'crypto';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export const cryptoUtils = {
  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Generate random token
   */
  generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  },

  /**
   * HMAC SHA256 signature (for webhooks)
   */
  hmacSHA256(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  },

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.hmacSHA256(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  },
};
