import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken, generateRefreshToken, cookieOptions, refreshCookieOptions } from '@/lib/auth';
import { comparePassword } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, identifier, password } = body;
    const loginIdentifier = identifier || phone || email;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Phone/Email and password are required' },
        { status: 400 }
      );
    }

    const isEmail = loginIdentifier.includes('@');

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: loginIdentifier } : { phone: loginIdentifier },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isSubscribed: true,
        subscriptionExpiry: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isSubscribed = user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();
    let statusCode = 200;
    if (!isSubscribed && user.subscriptionExpiry) {
      statusCode = 400;
    } else if (!isSubscribed) {
      statusCode = 403;
    }

    const accessToken = await generateAccessToken({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
      role: user.role,
    });

    const refreshToken = await generateRefreshToken({
      userId: user.id,
      type: 'refresh',
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
          isSubscribed,
          subscriptionExpiry: user.subscriptionExpiry,
        },
        accessToken,
      },
      message: 'Login successful',
    }, { status: statusCode });

    response.cookies.set('accessToken', accessToken, cookieOptions);
    response.cookies.set('refreshToken', refreshToken, refreshCookieOptions);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
