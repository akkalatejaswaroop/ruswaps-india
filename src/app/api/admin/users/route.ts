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
    const type = searchParams.get('type') || 'users';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const skip = (page - 1) * limit;

    // Support legacy/dashboard combined API
    if (type === 'stats') {
      const stats = {
        totalUsers: await prisma.user.count(),
        subscribedUsers: await prisma.user.count({ where: { isSubscribed: true } }),
        totalCalculations: await prisma.calculation.count(),
        newUsersThisMonth: await prisma.user.count({ 
          where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } 
        }),
        revenueThisMonth: 0, // Placeholder
        userGrowth: 15, // Placeholder
        revenueGrowth: 10, // Placeholder
        calculationsByType: [],
        conversionRate: 5.2,
      };
      return NextResponse.json({ success: true, data: stats });
    }

    if (type === 'users') {
      const query = searchParams.get('q');
      const where = query ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' as const } }
        ]
      } : {};

      const total = await prisma.user.count({ where });
      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          isSubscribed: true,
          isActive: true,
          subscriptionExpiry: true,
          createdAt: true,
        }
      });

      return NextResponse.json({ 
        success: true, 
        data: users,
        total,
        totalPages: Math.ceil(total / limit)
      });
    }

    if (type === 'calculations') {
      const total = await prisma.calculation.count();
      const calculations = await prisma.calculation.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true, phone: true } } }
      });
      return NextResponse.json({ success: true, data: calculations, total, totalPages: Math.ceil(total / limit) });
    }

    // Default: return user list if no type or unknown type
    const users = await prisma.user.findMany({ take: 50 });
    return NextResponse.json({ success: true, data: users });

  } catch (error) {
    logger.error('Admin API error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const { userId, isSubscribed, role } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (isSubscribed !== undefined) updateData.isSubscribed = isSubscribed;
    if (role !== undefined) updateData.role = role;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        userId: authResult.user?.userId,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: userId,
        details: updateData
      }
    });

    return NextResponse.json({ success: true, data: user });

  } catch (error) {
    logger.error('User update error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
