import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const { userId, caseName, amount, type, notes } = body;

    if (!userId || !caseName || !amount) {
      return NextResponse.json({ success: false, message: 'Required fields missing' }, { status: 400 });
    }

    const revenue = await prisma.revenueEntry.create({
      data: {
        userId,
        caseName,
        amount,
        type: type || 'legal-fee',
        notes
      }
    });

    logger.info('Revenue entry created', { adminId: authResult.user?.userId, revenueId: revenue.id });

    return NextResponse.json({ success: true, data: revenue });

  } catch (error) {
    logger.error('Revenue creation error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where = userId ? { userId } : {};

    const revenue = await prisma.revenueEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        user: { select: { name: true, phone: true } }
      }
    });

    return NextResponse.json({ success: true, data: revenue });

  } catch (error) {
    logger.error('Revenue fetch error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
