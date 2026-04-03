// JWT Authentication utilities - Edge Runtime compatible
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '90d';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const secretKey = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : new TextEncoder().encode('dev-only-secret-do-not-use-in-production');

export interface TokenPayload {
  userId: string;
  phone: string;
  email?: string;
  role?: string;
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

// Cookie settings
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

export const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
};
