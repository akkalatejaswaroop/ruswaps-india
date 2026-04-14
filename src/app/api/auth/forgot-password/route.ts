import { NextRequest, NextResponse } from 'next/server';
import { randomInt, timingSafeEqual } from 'crypto';
import { hashPassword } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { encryptOTP, decryptOTP, isEncryptedOTP } from '@/lib/otp-encryption';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 3;
const OTP_ATTEMPT_WINDOW = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;

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

async function checkOtpAttemptRateLimit(email: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - OTP_ATTEMPT_WINDOW);
    const expiresAt = new Date(now.getTime() + OTP_ATTEMPT_WINDOW);

    const key = `otp-attempt:${email.toLowerCase()}`;
    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!existing || existing.windowStart < windowStart) {
      await prisma.rateLimit.upsert({
        where: { key },
        update: { count: 1, windowStart: now, expiresAt },
        create: { key, count: 1, windowStart: now, expiresAt },
      });
      return { allowed: true, remaining: OTP_MAX_ATTEMPTS - 1 };
    }

    if (existing.count >= OTP_MAX_ATTEMPTS) {
      return { allowed: false, remaining: 0 };
    }

    await prisma.rateLimit.update({
      where: { key },
      data: { count: existing.count + 1 },
    });
    return { allowed: true, remaining: OTP_MAX_ATTEMPTS - existing.count - 1 };
  } catch (error) {
    console.error('OTP attempt rate limit error:', error);
    return { allowed: false, remaining: 0 };
  }
}

async function resetOtpAttemptRateLimit(email: string): Promise<void> {
  try {
    const key = `otp-attempt:${email.toLowerCase()}`;
    await prisma.rateLimit.delete({ where: { key } }).catch(() => {});
  } catch (error) {
    console.error('Reset OTP attempt rate limit error:', error);
  }
}

function generateSecureOtp(): string {
  const buffer = new Uint8Array(4);
  crypto.getRandomValues(buffer);
  const num = (buffer[0] << 24 | buffer[1] << 16 | buffer[2] << 8 | buffer[3]) >>> 0;
  return String(num % 900000 + 100000);
}

async function simulateWork(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, randomInt(200, 500)));
  await hashPassword(randomInt(100000, 1000000).toString());
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
    
    const rateLimitByIp = await checkRateLimit(`forgot-password:ip:${clientIp}`);
    if (!rateLimitByIp) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    let { email } = body;
    if (email) email = email.trim().toLowerCase();
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    const rateLimitByEmail = await checkRateLimit(`forgot-password:email:${email}`);
    if (!rateLimitByEmail) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!existingUser) {
      await simulateWork();
      return NextResponse.json(
        { success: true, message: 'If an account exists, a reset email has been sent.' },
        { status: 200 }
      );
    }

    const otp = generateSecureOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    const phoneOrFallback = existingUser.phone || email;
    const encryptedOtp = encryptOTP(otp);

    await prisma.otp.upsert({
      where: { phone_purpose: { phone: phoneOrFallback, purpose: 'reset_password' } },
      update: { otp: encryptedOtp, email, expires, createdAt: new Date(), attempts: 0 },
      create: { phone: phoneOrFallback, email, otp: encryptedOtp, expires, purpose: 'reset_password', attempts: 0 },
    });

    await sendOTPEmail(email, otp, existingUser.name || '');

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset email has been sent.',
    });

  } catch (error) {
    logger.error('Forgot password error', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    
    const rateLimitByIp = await checkRateLimit(`forgot-verify:ip:${clientIp}`);
    if (!rateLimitByIp) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    let { email, otp, password } = body;
    if (email) email = email.trim().toLowerCase();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { success: false, message: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    if (otp.length !== OTP_LENGTH) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code format' },
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

    const otpAttemptCheck = await checkOtpAttemptRateLimit(email);
    if (!otpAttemptCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    const phoneOrFallback = existingUser?.phone || email;
    const otpRecord = await prisma.otp.findUnique({
      where: {
        phone_purpose: {
          phone: phoneOrFallback,
          purpose: 'reset_password',
        },
      },
    });

    if (!existingUser || !otpRecord) {
      await simulateWork();
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (otpRecord.attempts && otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
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

    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashedPassword },
    });

    await prisma.otp.delete({ where: { id: otpRecord.id } });
    await resetOtpAttemptRateLimit(email);

    logger.info('Password reset', { userId: existingUser.id });

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated',
    });

  } catch (error) {
    logger.error('Password reset verify error', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
