import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken, generateRefreshToken, cookieOptions, refreshCookieOptions } from '@/lib/auth';
import { comparePassword } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { generateCSRFToken, CSRF_COOKIE_NAME } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;
    
    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Phone/Email and password are required' },
        { status: 400 }
      );
    }

    const loginIdentifier = identifier.trim();
    const isEmail = loginIdentifier.includes('@');
    const queryIdentifier = isEmail ? loginIdentifier.toLowerCase() : loginIdentifier;

    let user;
    try {
      user = await prisma.user.findFirst({
        where: isEmail 
          ? { email: { equals: queryIdentifier, mode: 'insensitive' } } 
          : { phone: queryIdentifier },
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
    } catch (dbError) {
      logger.error('Login database error', dbError);
      return NextResponse.json(
        { success: false, message: 'An error occurred. Please try again.' },
        { status: 500 }
      );
    }

    if (!user || !user.isActive) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isSubscribed = user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();

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

    logger.info('User login', { userId: user.id });

    const csrfToken = generateCSRFToken();

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
        csrfToken: csrfToken.token,
      },
    });

    response.cookies.set('accessToken', accessToken, cookieOptions);
    response.cookies.set('refreshToken', refreshToken, refreshCookieOptions);

    response.cookies.set(CSRF_COOKIE_NAME, csrfToken.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
    });

    return response;

  } catch (error) {
    logger.error('Login error', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
