import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, TokenPayload, decodeToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/app/version',
  '/login',
  '/signup',
  '/forgot-password',
  '/_next',
  '/favicon.ico',
  '/logo.png',
];

const PROTECTED_ROUTES = [
  '/dashboard',
  '/subscription',
  '/profile',
  '/case-directory',
  '/admin',
];

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://ruswaps.in',
  'https://www.ruswaps.in',
].filter(Boolean) as string[];

const CORS_MAX_AGE = 86400;

function isAccessToken(payload: TokenPayload | { userId: string; type: 'refresh' } | null): payload is TokenPayload {
  return payload !== null && 'role' in payload;
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (decoded && 'exp' in decoded) {
      const exp = (decoded as { exp: number }).exp;
      return Date.now() >= exp * 1000;
    }
    return true;
  } catch {
    return true;
  }
}

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  
  if (!origin) {
    return ALLOWED_ORIGINS[0] || null;
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  return null;
}

function createCorsResponse(request: NextRequest): NextResponse {
  const origin = getAllowedOrigin(request);
  
  const response = new NextResponse(null, { status: 204 });

  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', CORS_MAX_AGE.toString());

  return response;
}

async function refreshAccessToken(request: NextRequest): Promise<{ 
  success: boolean; 
  response?: NextResponse;
  cookies?: { accessToken?: string; refreshToken?: string };
}> {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    if (!refreshToken) {
      return { success: false };
    }

    const payload = await verifyToken(refreshToken);
    if (!payload || !('type' in payload) || (payload as { type: string }).type !== 'refresh') {
      return { success: false };
    }

    const userId = (payload as { userId: string }).userId;
    const userPayload = await verifyToken(request.cookies.get('accessToken')?.value || '');
    
    const response = NextResponse.json({ success: true });
    
    if (userPayload && isAccessToken(userPayload)) {
      const { generateAccessToken, generateRefreshToken, cookieOptions, refreshCookieOptions } = await import('@/lib/auth');
      
      const newAccessToken = await generateAccessToken({
        userId: userPayload.userId,
        phone: userPayload.phone,
        email: userPayload.email,
        role: userPayload.role,
      });
      
      const newRefreshToken = await generateRefreshToken({
        userId: userPayload.userId,
        type: 'refresh',
      });
      
      response.cookies.set('accessToken', newAccessToken, cookieOptions);
      response.cookies.set('refreshToken', newRefreshToken, refreshCookieOptions);
      
      return { success: true, response };
    }
    
    return { success: false };
  } catch (error) {
    logger.error('Token refresh error', error);
    return { success: false };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return createCorsResponse(request);
  }

  const origin = getAllowedOrigin(request);

  if (!origin && process.env.NODE_ENV === 'production' && pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Origin not allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const isPublicPath = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));

  if (isPublicPath) {
    const response = NextResponse.next();
    if (pathname.startsWith('/api/') && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
    }
    return response;
  }

  if (pathname.startsWith('/api/')) {
    let token = request.cookies.get('accessToken')?.value;
    let isExpired = token ? isTokenExpired(token) : true;
    let payload = token ? await verifyToken(token) : null;

    if (isExpired || !payload || !isAccessToken(payload)) {
      const refreshResult = await refreshAccessToken(request);
      if (!refreshResult.success) {
        return NextResponse.json(
          { success: false, message: 'Session expired. Please login again.' },
          { status: 401 }
        );
      }
      const response = refreshResult.response || NextResponse.next();
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      return response;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-request-id', crypto.randomUUID());

    if (payload.phone) {
      requestHeaders.set('x-user-phone', payload.phone);
    }
    if (payload.role) {
      requestHeaders.set('x-user-role', payload.role);
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  }

  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    let token = request.cookies.get('accessToken')?.value;
    let isExpired = token ? isTokenExpired(token) : true;
    let payload = token ? await verifyToken(token) : null;

    if (pathname.startsWith('/admin')) {
      if (isExpired || !payload || !isAccessToken(payload)) {
        const refreshResult = await refreshAccessToken(request);
        if (!refreshResult.success) {
          return NextResponse.redirect(new URL('/login', request.url));
        }
        token = request.cookies.get('accessToken')?.value;
        payload = token ? await verifyToken(token) : null;
      }

      if (!payload || !isAccessToken(payload) || payload.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      return NextResponse.next();
    }

    if (isExpired || !payload || !isAccessToken(payload)) {
      const refreshResult = await refreshAccessToken(request);
      if (!refreshResult.success) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/subscription/:path*',
    '/profile/:path*',
    '/case-directory/:path*',
    '/admin/:path*',
    '/admin',
  ],
};
