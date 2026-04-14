import { prisma } from '@/lib/prisma';
import { logger } from './logger';
import { createHash } from 'crypto';

export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    const revokedAt = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { 
        lastPasswordChange: revokedAt,
      },
    });
    logger.info('All tokens revoked for user', { userId });
  } catch (error) {
    logger.error('Failed to revoke tokens', error, { userId });
    throw error;
  }
}

export async function isTokenRevoked(userId: string, tokenIssuedAt: Date): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastPasswordChange: true },
    });

    if (!user) return true;

    if (!user.lastPasswordChange) return false;

    return tokenIssuedAt < user.lastPasswordChange;
  } catch (error) {
    logger.error('Token revocation check failed', error);
    return false;
  }
}

export function generateTokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
