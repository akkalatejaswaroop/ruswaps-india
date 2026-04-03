import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) return false;
  
  const payload = (await verifyToken(token)) as any;
  if (!payload) return false;
  return payload.role === 'ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (type === 'users') {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            phone: true,
            email: true,
            name: true,
            role: true,
            isSubscribed: true,
            isActive: true,
            subscriptionExpiry: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count(),
      ]);
      return NextResponse.json({ success: true, data: users, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (type === 'subscriptions') {
      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          include: {
            user: {
              select: { name: true, phone: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.subscription.count(),
      ]);
      return NextResponse.json({ success: true, data: subscriptions, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (type === 'calculations') {
      const [calculations, total] = await Promise.all([
        prisma.calculation.findMany({
          include: {
            user: {
              select: { name: true, phone: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.calculation.count(),
      ]);
      return NextResponse.json({ success: true, data: calculations, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (type === 'cases') {
      const [cases, total] = await Promise.all([
        prisma.case.findMany({
          include: {
            user: {
              select: { name: true, phone: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.case.count(),
      ]);
      return NextResponse.json({ success: true, data: cases, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (type === 'notifications') {
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          include: {
            user: {
              select: { name: true, phone: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count(),
      ]);
      return NextResponse.json({ success: true, data: notifications, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (type === 'stats') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        subscribedUsers,
        totalCalculations,
        totalSubscriptions,
        newUsersThisMonth,
        newUsersLastMonth,
        revenueThisMonth,
        revenueLastMonth,
        calculationsByType,
        recentSubscriptions,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isSubscribed: true } }),
        prisma.calculation.count(),
        prisma.subscription.count({ where: { status: 'completed' } }),
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
        prisma.subscription.aggregate({
          where: { status: 'completed', createdAt: { gte: thirtyDaysAgo } },
          _sum: { amount: true },
        }),
        prisma.subscription.aggregate({
          where: { status: 'completed', createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
          _sum: { amount: true },
        }),
        prisma.calculation.groupBy({
          by: ['type'],
          _count: { type: true },
        }),
        prisma.subscription.findMany({
          where: { status: 'completed' },
          include: { user: { select: { name: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const userGrowth = newUsersLastMonth > 0 ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1) : 0;
      const revenueGrowth = revenueLastMonth._sum.amount ? ((Number(revenueThisMonth._sum.amount || 0) - Number(revenueLastMonth._sum.amount || 0)) / Number(revenueLastMonth._sum.amount) * 100).toFixed(1) : 0;

      return NextResponse.json({
        success: true,
        data: {
          totalUsers,
          subscribedUsers,
          totalCalculations,
          totalSubscriptions,
          newUsersThisMonth,
          userGrowth,
          revenueThisMonth: Number(revenueThisMonth._sum.amount || 0),
          revenueLastMonth: Number(revenueLastMonth._sum.amount || 0),
          revenueGrowth,
          calculationsByType,
          recentSubscriptions,
          conversionRate: totalUsers > 0 ? ((subscribedUsers / totalUsers) * 100).toFixed(1) : 0,
        },
      });
    }

    if (type === 'user-detail') {
      const userId = searchParams.get('userId');
      if (!userId) return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          isSubscribed: true,
          isActive: true,
          subscriptionExpiry: true,
          createdAt: true,
          playerId: true,
        },
      });

      const [calculations, subscriptions, cases] = await Promise.all([
        prisma.calculation.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.subscription.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.case.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return NextResponse.json({ success: true, data: { user, calculations, subscriptions, cases } });
    }

    return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, title, message, settings } = body;

    if (action === 'notify') {
      const notification = await prisma.notification.create({
        data: { userId, title, message, type: 'admin' },
      });
      return NextResponse.json({ success: true, data: notification });
    }

    if (action === 'broadcast') {
      const users = await prisma.user.findMany({ select: { id: true } });
      const notifications = await prisma.notification.createMany({
        data: users.map(user => ({ userId: user.id, title, message, type: 'broadcast' })),
      });
      return NextResponse.json({ success: true, data: { count: notifications.count } });
    }

    if (action === 'get-settings') {
      const settings = await prisma.appVersion.findFirst({ orderBy: { updatedAt: 'desc' } });
      return NextResponse.json({ success: true, data: settings });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
