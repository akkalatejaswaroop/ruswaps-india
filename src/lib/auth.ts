// JWT Authentication utilities - Edge Runtime compatible
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// We allow missing secret during build to avoid crashes
const secretKey = new TextEncoder().encode(JWT_SECRET || 'temp-secret-key-for-build-purposes-only-change-this-in-env');

export interface TokenPayload {
  userId: string;
  phone: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

export async function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secretKey);
}

export async function generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new jose.SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<TokenPayload | RefreshTokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    if (!payload.userId) return null;
    if (payload.type === 'refresh') {
      return { userId: payload.userId as string, type: 'refresh' };
    }
    return {
      userId: payload.userId as string,
      phone: payload.phone as string,
      email: payload.email as string | undefined,
      role: payload.role as string | undefined,
    };
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | RefreshTokenPayload | null {
  try {
    const decoded = jose.decodeJwt(token);
    return decoded as unknown as TokenPayload | RefreshTokenPayload;
  } catch (error) {
    return null;
  }
}

export function getTokenExpiry(token: string): Date | null {
  const decoded = decodeToken(token);
  if (decoded && 'exp' in decoded) {
    return new Date((decoded.exp as number) * 1000);
  }
  return null;
}

export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry < new Date();
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60,
  path: '/',
};

export const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60,
};
