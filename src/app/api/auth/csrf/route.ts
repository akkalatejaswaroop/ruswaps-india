import { NextResponse } from 'next/server';
import { generateCSRFToken, CSRF_COOKIE_NAME } from '@/lib/csrf';

export async function GET() {
  const csrfToken = generateCSRFToken();
  
  const response = NextResponse.json({
    success: true,
    csrfToken: csrfToken.token,
  });
  
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken.secret, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600,
  });
  
  return response;
}
