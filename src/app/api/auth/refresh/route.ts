import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateAccessToken, generateRefreshToken, cookieOptions, refreshCookieOptions, RefreshTokenPayload, TokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REFRESH_ATTEMPTS = 10;

async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);
    const expiresAt = new Date(now.getTime() + RATE_LIMIT_WINDOW);

    const existing = await prisma.rateLimit.findUnique({
      where: { key: identifier },
    });

    if (!existing || existing.windowStart < windowStart) {
      await prisma.rateLimit.upsert({
        where: { key: identifier },
        update: { count: 1, windowStart: now, expiresAt },
        create: { key: identifier, count: 1, windowStart: now, expiresAt },
      });
      return true;
    }

    if (existing.count >= MAX_REFRESH_ATTEMPTS) {
      return false;
    }

    await prisma.rateLimit.update({
      where: { key: identifier },
      data: { count: existing.count + 1 },
    });
    return true;
  } catch (error) {
    console.error('Rate limit check error:', { code: 'RATE_LIMIT_ERROR', timestamp: new Date().toISOString() });
    return false;
  }
}

function isRefreshToken(payload: TokenPayload | RefreshTokenPayload | null): payload is RefreshTokenPayload {
  return payload !== null && 'type' in payload && (payload as RefreshTokenPayload).type === 'refresh' && !('role' in payload);
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    const rateLimitCheck = await checkRateLimit(`refresh:ip:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many refresh attempts' }, { status: 429 });
    }

    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json({ success: false, message: 'Refresh token missing' }, { status: 401 });
    }

    const payload = await verifyToken(refreshToken);
    if (!payload || !isRefreshToken(payload)) {
      return NextResponse.json({ success: false, message: 'Invalid refresh token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, phone: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, message: 'User not found or inactive' }, { status: 401 });
    }

    const accessToken = await generateAccessToken({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
      role: user.role,
    });

    const newRefreshToken = await generateRefreshToken({
      userId: user.id,
      type: 'refresh',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });

    response.cookies.set('accessToken', accessToken, cookieOptions);
    response.cookies.set('refreshToken', newRefreshToken, refreshCookieOptions);

    return response;

  } catch (error) {
    console.error('Token refresh error:', { code: 'TOKEN_REFRESH_ERROR', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
