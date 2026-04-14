import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;

  try {
    const unreadCount = await prisma.aPCourtNotification.count({
      where: {
        userId: user.userId,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    logger.error('Error counting notifications', error);
    return NextResponse.json(
      { success: false, error: 'Failed to count notifications' },
      { status: 500 }
    );
  }
}
