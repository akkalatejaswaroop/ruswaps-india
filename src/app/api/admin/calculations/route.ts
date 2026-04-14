import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    interface Where {
      userId?: string;
      type?: string;
    }
    const where: Where = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;

    const calculations = await prisma.calculation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, phone: true } }
      }
    });

    return NextResponse.json({ success: true, data: calculations });

  } catch (error) {
    logger.error('Admin calculations fetch error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    await prisma.calculation.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        userId: authResult.user?.userId,
        action: 'DELETE_CALCULATION',
        entity: 'Calculation',
        entityId: id
      }
    });

    return NextResponse.json({ success: true, message: 'Calculation deleted' });

  } catch (error) {
    logger.error('Calculation delete error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
