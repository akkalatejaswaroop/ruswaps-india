import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';
import { z } from 'zod';

const patchBodySchema = z.object({
  ids: z.array(z.string().uuid('Invalid notification ID')).max(100).optional(),
  all: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;

  try {
    const notifications = await prisma.aPCourtNotification.findMany({
      where: { userId: user.userId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        courtCase: {
          select: {
            cnrNumber: true,
            caseNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.error('Error fetching notifications', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;

  try {
    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { ids, all } = parsed.data;

    if (all === true) {
      await prisma.aPCourtNotification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true },
      });
    } else if (ids && ids.length > 0) {
      const validNotifications = await prisma.aPCourtNotification.findMany({
        where: {
          id: { in: ids },
          userId: user.userId,
        },
        select: { id: true },
      });
      
      const validIds = validNotifications.map(n => n.id);
      
      if (validIds.length > 0) {
        await prisma.aPCourtNotification.updateMany({
          where: { id: { in: validIds } },
          data: { isRead: true },
        });
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Must provide ids or all=true' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Notifications marked as read' },
    });
  } catch (error) {
    logger.error('Error updating notifications', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
