import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) return false;
  
  const payload = (await verifyToken(token)) as any;
  if (!payload) return false;
  return payload.role === 'ADMIN';
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const adminToken = request.cookies.get('accessToken')?.value;
    const adminPayload = await verifyToken(adminToken || '');
    
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
    } else if (action === 'promote') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' } as any,
      });
    } else if (action === 'demote') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'USER' } as any,
      });
    }

    return NextResponse.json({ success: true, message: 'Action completed', performedBy: adminPayload?.userId });

  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
