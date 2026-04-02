import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (action === 'activate') {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });
    } else if (action === 'deactivate') {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
    } else if (action === 'subscribe') {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      await prisma.user.update({
        where: { id: userId },
        data: { isSubscribed: true, subscriptionExpiry: endDate },
      });
    } else if (action === 'unsubscribe') {
      await prisma.user.update({
        where: { id: userId },
        data: { isSubscribed: false, subscriptionExpiry: null },
      });
    }

    return NextResponse.json({ success: true, message: 'Action completed' });

  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
