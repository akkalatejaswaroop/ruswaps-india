import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, isTokenExpired } from '@/lib/auth';

const publicPaths = ['/api/auth', '/api/app/version', '/login', '/signup', '/api/payments/razorpay'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') && !publicPaths.some(p => pathname.startsWith(p))) {
    const token = request.cookies.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (isTokenExpired(token)) {
      return NextResponse.json({ success: false, message: 'Token expired' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    if ('phone' in payload) {
      requestHeaders.set('x-user-phone', payload.phone);
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/subscription/:path*',
  ],
};
