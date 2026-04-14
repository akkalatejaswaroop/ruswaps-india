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

    const totalUsers = await prisma.user.count();
    const activeSubscribers = await prisma.user.count({
      where: { isSubscribed: true }
    });

    const totalCalculations = await prisma.calculation.count();
    const verifiedCalculations = await prisma.calculation.count({
      where: { isVerified: true }
    });

    const totalRevenue = await prisma.revenueEntry.aggregate({
      _sum: {
        amount: true
      }
    });

    const recentCalculations = await prisma.calculation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { name: true, phone: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeSubscribers,
        totalCalculations,
        verifiedCalculations,
        totalRevenue: totalRevenue._sum.amount || 0,
        recentCalculations
      }
    });

  } catch (error) {
    logger.error('Admin stats error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
