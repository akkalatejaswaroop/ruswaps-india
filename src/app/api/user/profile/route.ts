import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, comparePassword } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

function getAuthUser(request: NextRequest): { userId: string } | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return { userId };
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        isSubscribed: true,
        subscriptionExpiry: true,
        playerId: true,
        createdAt: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: userData });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, playerId } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(playerId && { playerId }),
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser, message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'Current and new password are required' }, { status: 400 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { password: true },
    });

    if (!userData) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const isValid = await comparePassword(currentPassword, userData.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
