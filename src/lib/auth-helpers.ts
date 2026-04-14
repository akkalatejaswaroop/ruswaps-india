import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload, RefreshTokenPayload } from './auth';
import { logger } from './logger';
import { prisma } from './prisma';

export interface AuthUser {
  userId: string;
  phone: string;
  email?: string;
  role?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  response?: NextResponse;
}

function isAccessToken(payload: TokenPayload | RefreshTokenPayload | null): payload is TokenPayload {
  return payload !== null && 'role' in payload;
}

async function checkTokenRevocation(userId: string, tokenIssuedAt: Date): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastPasswordChange: true },
    });

    if (!user) return true;
    if (!user.lastPasswordChange) return false;

    return tokenIssuedAt < user.lastPasswordChange;
  } catch (error) {
    logger.error('Token revocation check failed', error);
    return false;
  }
}

export async function verifyAccessToken(request: NextRequest): Promise<AuthResult> {
  try {
    const token = request.cookies.get('accessToken')?.value;
    
    if (!token) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        ),
      };
    }

    const payload = await verifyToken(token);
    
    if (!payload || !isAccessToken(payload)) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: 'Invalid or expired token' },
          { status: 401 }
        ),
      };
    }

    const tokenIssuedAt = new Date(payload.iat ? payload.iat * 1000 : 0);
    const isRevoked = await checkTokenRevocation(payload.userId, tokenIssuedAt);
    
    if (isRevoked) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: 'Session expired. Please login again.' },
          { status: 401 }
        ),
      };
    }

    return {
      success: true,
      user: {
        userId: payload.userId,
        phone: payload.phone,
        email: payload.email,
        role: payload.role,
      },
    };
  } catch (error) {
    logger.error('Token verification error', error);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 401 }
      ),
    };
  }
}

export async function verifyAdminAccess(request: NextRequest): Promise<AuthResult> {
  const result = await verifyAccessToken(request);
  
  if (!result.success) {
    return result;
  }

  if (result.user?.role !== 'ADMIN') {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return result;
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status: 403 }
  );
}

export function badRequestResponse(message: string): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status: 400 }
  );
}

export function notFoundResponse(message = 'Resource not found'): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status: 404 }
  );
}

export function serverErrorResponse(message = 'Internal server error'): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status: 500 }
  );
}
