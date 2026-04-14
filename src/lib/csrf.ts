import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_SECRET_LENGTH = 32;
const CSRF_TOKEN_LENGTH = 64;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export interface CSRFTokenData {
  token: string;
  secret: string;
}

function generateSecureToken(length: number): string {
  return randomBytes(length).toString('hex');
}

export function generateCSRFToken(): CSRFTokenData {
  const secret = generateSecureToken(CSRF_SECRET_LENGTH);
  // Token starts with secret so it can be verified
  const token = secret + generateSecureToken(CSRF_SECRET_LENGTH);
  return { token, secret };
}

export function createCSRFResponse(tokenData: CSRFTokenData): Response {
  const response = new Response(JSON.stringify({ 
    success: true, 
    csrfToken: tokenData.token 
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  response.headers.append('Set-Cookie', 
    `${CSRF_COOKIE_NAME}=${tokenData.secret}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=3600`
  );
  
  return response;
}

export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const storedSecret = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!storedSecret) {
    return false;
  }

  const requestToken = request.headers.get(CSRF_HEADER_NAME);
  
  if (!requestToken) {
    return false;
  }

  try {
    const secretBuffer = Buffer.from(storedSecret, 'hex');
    const tokenBuffer = Buffer.from(requestToken.slice(0, CSRF_SECRET_LENGTH * 2), 'hex');
    
    if (secretBuffer.length !== tokenBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(secretBuffer, tokenBuffer);
  } catch {
    return false;
  }
}

export function validateCSRFForRoute(handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: unknown[]) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const isValid = await validateCSRFToken(request);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
    return handler(request, ...args);
  };
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
