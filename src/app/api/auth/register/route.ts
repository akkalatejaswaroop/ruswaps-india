import { NextRequest, NextResponse } from 'next/server';
import { randomInt, timingSafeEqual } from 'crypto';
import { generateAccessToken, generateRefreshToken, cookieOptions, refreshCookieOptions } from '@/lib/auth';
import { hashPassword } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { encryptOTP, decryptOTP, isEncryptedOTP } from '@/lib/otp-encryption';
import { generateCSRFToken, CSRF_COOKIE_NAME } from '@/lib/csrf';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 3;
const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 5;

const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map(p => p.trim());

function timingSafeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const dummy = Buffer.alloc(a.length);
    timingSafeEqual(dummy, Buffer.from(a));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXIES.includes(ip);
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    for (const ip of ips) {
      if (!isTrustedProxy(ip)) {
        return ip;
      }
    }
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp && !isTrustedProxy(realIp)) {
    return realIp;
  }
  
  return '127.0.0.1';
}

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

    if (existing.count >= MAX_ATTEMPTS) {
      return false;
    }

    await prisma.rateLimit.update({
      where: { key: identifier },
      data: { count: existing.count + 1 },
    });
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false;
  }
}

function generateSecureOtp(): string {
  const buffer = new Uint8Array(4);
  crypto.getRandomValues(buffer);
  const num = (buffer[0] << 24 | buffer[1] << 16 | buffer[2] << 8 | buffer[3]) >>> 0;
  return String(num % 900000 + 100000);
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.trim().slice(0, 100).replace(/[<>'"&]/g, '');
}

function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(sanitized) ? sanitized.slice(0, 255) : '';
}

function sanitizePhone(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.slice(0, 10);
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    
    const rateLimitByIp = await checkRateLimit(`register:ip:${clientIp}`);
    if (!rateLimitByIp) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawName = body.name;
    const rawPhone = body.phone;
    const rawEmail = body.email;
    const password = body.password;
    
    const name = sanitizeName(rawName);
    const phone = sanitizePhone(rawPhone);
    const email = sanitizeEmail(rawEmail);

    if (!name || !phone || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (phone.length !== 10) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.error },
        { status: 400 }
      );
    }

    const rateLimitByPhone = await checkRateLimit(`register:phone:${phone}`);
    if (!rateLimitByPhone) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email }] },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with these credentials may already exist' },
        { status: 409 }
      );
    }

    const otp = generateSecureOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    const encryptedOtp = encryptOTP(otp);

    await prisma.otp.upsert({
      where: { phone_purpose: { phone, purpose: 'register' } },
      update: { otp: encryptedOtp, email, expires, createdAt: new Date(), attempts: 0 },
      create: { phone, email, otp: encryptedOtp, expires, purpose: 'register', attempts: 0 },
    });

    await sendOTPEmail(email, otp, name);

    const csrfToken = generateCSRFToken();
    const response = NextResponse.json({
      success: true,
      message: 'OTP sent to email',
    });
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
    });
    return response;

  } catch (error) {
    logger.error('Registration error', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    
    const rateLimitByIp = await checkRateLimit(`resend:ip:${clientIp}`);
    if (!rateLimitByIp) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Phone is required' },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const rateLimitByPhone = await checkRateLimit(`resend:phone:${phone}`);
    if (!rateLimitByPhone) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const otpRecord = await prisma.otp.findUnique({
      where: { phone_purpose: { phone, purpose: 'register' } },
    });

    if (!otpRecord || new Date(otpRecord.expires) < new Date()) {
      return NextResponse.json({
        success: false,
        message: 'Please register again to get new OTP',
      }, { status: 400 });
    }

    const decryptedOtp = isEncryptedOTP(otpRecord.otp) ? decryptOTP(otpRecord.otp) : otpRecord.otp;
    if (!decryptedOtp) {
      return NextResponse.json({
        success: false,
        message: 'Please register again to get new OTP',
      }, { status: 400 });
    }

    await sendOTPEmail(otpRecord.email, decryptedOtp, '');

    return NextResponse.json({
      success: true,
      message: 'OTP resent to email',
    });

  } catch (error) {
    logger.error('OTP resend error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resend OTP' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    
    const rateLimitByIp = await checkRateLimit(`verify:ip:${clientIp}`);
    if (!rateLimitByIp) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    let { phone, email, otp, name, password } = body;
    if (email) email = email.trim().toLowerCase();
    if (phone) phone = phone.trim();

    if (phone) {
      const rateLimitByPhone = await checkRateLimit(`verify:phone:${phone}`);
      if (!rateLimitByPhone) {
        return NextResponse.json(
          { success: false, message: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }

    const missingFields = [];
    if (!phone && !email) missingFields.push('Phone/Email');
    if (!otp) missingFields.push('OTP');
    if (!name) missingFields.push('Name');
    if (!password) missingFields.push('Password');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    if (otp.length !== OTP_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Invalid OTP format` },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.error },
        { status: 400 }
      );
    }

    const andConditions: Record<string, unknown>[] = [{ purpose: 'register' }, { phone }];

    const otpRecord = await prisma.otp.findFirst({
      where: { AND: andConditions },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (otpRecord.attempts && otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    if (new Date(otpRecord.expires) < new Date()) {
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { success: false, message: 'Verification code expired' },
        { status: 400 }
      );
    }

    const storedOtp = isEncryptedOTP(otpRecord.otp) ? decryptOTP(otpRecord.otp) : otpRecord.otp;
    if (!storedOtp || !timingSafeStringCompare(storedOtp, otp)) {
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: (otpRecord.attempts || 0) + 1 },
      });
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: otpRecord.email,
        password: hashedPassword,
        isActive: true,
        isSubscribed: false,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        isSubscribed: true,
      },
    });

    await prisma.otp.delete({ where: { id: otpRecord.id } });

    const accessToken = await generateAccessToken({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
      role: 'USER',
    });

    const refreshToken = await generateRefreshToken({
      userId: user.id,
      type: 'refresh',
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          isSubscribed: user.isSubscribed,
        },
      },
      message: 'Registration successful',
    });

    response.cookies.set('accessToken', accessToken, cookieOptions);
    response.cookies.set('refreshToken', refreshToken, refreshCookieOptions);

    return response;

  } catch (error) {
    logger.error('OTP verify error', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
