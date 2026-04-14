import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload, RefreshTokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

function isAccessToken(payload: TokenPayload | RefreshTokenPayload | null): payload is TokenPayload {
  return payload !== null && 'role' in payload;
}

async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) return { isAdmin: false };
  
  const payload = await verifyToken(token);
  if (!payload || !isAccessToken(payload)) return { isAdmin: false };
  if (payload.role !== 'ADMIN') return { isAdmin: false };
  return { isAdmin: true, userId: payload.userId };
}

const ALLOWED_ACTIONS = ['activate', 'deactivate', 'subscribe', 'unsubscribe', 'promote', 'demote'] as const;
type AdminAction = typeof ALLOWED_ACTIONS[number];

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin.isAdmin || !admin.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, message: 'Valid user ID required' }, { status: 400 });
    }

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    if (userId === admin.userId) {
      return NextResponse.json({ success: false, message: 'Cannot modify your own account' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, isSubscribed: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const previousState = {
      role: targetUser.role,
      isActive: targetUser.isActive,
      isSubscribed: targetUser.isSubscribed,
    };

    let newRole = targetUser.role;
    let newIsActive = targetUser.isActive;
    let newIsSubscribed = targetUser.isSubscribed;

    switch (action) {
      case 'activate':
        newIsActive = true;
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: true },
        });
        break;
      case 'deactivate':
        newIsActive = false;
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        });
        break;
      case 'subscribe': {
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        newIsSubscribed = true;
        await prisma.user.update({
          where: { id: userId },
          data: { isSubscribed: true, subscriptionExpiry: endDate },
        });
        break;
      }
      case 'unsubscribe':
        newIsSubscribed = false;
        await prisma.user.update({
          where: { id: userId },
          data: { isSubscribed: false, subscriptionExpiry: null },
        });
        break;
      case 'promote':
        newRole = 'ADMIN';
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'ADMIN' },
        });
        break;
      case 'demote':
        newRole = 'USER';
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'USER' },
        });
        break;
    }

    logger.info('Admin action performed', {
      adminId: admin.userId,
      action,
      targetUserId: userId,
      previousState,
      newState: {
        role: newRole,
        isActive: newIsActive,
        isSubscribed: newIsSubscribed,
      },
    });

    return NextResponse.json({ success: true, message: 'Action completed' });

  } catch (error) {
    logger.error('Admin action error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
