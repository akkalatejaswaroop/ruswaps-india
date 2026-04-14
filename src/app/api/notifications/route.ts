import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
    });

  } catch (error) {
    logger.error('Notifications fetch error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const body = await request.json();
    const { notificationId } = body;

    if (notificationId) {
      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId: user.userId },
      });
      
      if (!notification) {
        return NextResponse.json({ success: false, message: 'Notification not found' }, { status: 404 });
      }
      
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });

  } catch (error) {
    logger.error('Notifications update error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
