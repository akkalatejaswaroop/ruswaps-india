import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, decodeToken } from '@/lib/auth';

const publicPrefixes = ['/api/auth', '/api/app/version', '/login', '/signup', '/api/payments/razorpay'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPrefixes.some(p => pathname.startsWith(p));
  if (pathname.startsWith('/api/') && !isPublicPath) {
    const token = request.cookies.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    if ('phone' in payload && payload.phone) {
      requestHeaders.set('x-user-phone', payload.phone);
    }
    if ('role' in payload && payload.role) {
      requestHeaders.set('x-user-role', payload.role);
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
