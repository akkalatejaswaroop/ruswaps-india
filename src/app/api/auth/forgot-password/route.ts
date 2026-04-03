import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/email';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 3;

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(identifier, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { email } = body;
    if (email) email = email.trim().toLowerCase();
    
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!checkRateLimit(`forgot-password:${clientIp}:${email}`)) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    const phoneOrFallback = existingUser.phone || email; // OTP table requires phone

    await prisma.otp.upsert({
      where: { phone_purpose: { phone: phoneOrFallback, purpose: 'reset_password' } },
      update: { otp, email, expires, createdAt: new Date() },
      create: { phone: phoneOrFallback, email, otp, expires, purpose: 'reset_password' },
    });

    await sendOTPEmail(email, otp, existingUser.name || '');

    return NextResponse.json({
      success: true,
      message: 'Password reset OTP sent to email',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    let { email, otp, password } = body;
    if (email) email = email.trim().toLowerCase();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { success: false, message: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    const otpRecord = await prisma.otp.findFirst({
      where: {
        AND: [
          { email: email },
          { purpose: 'reset_password' }
        ]
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'OTP not found or expired' },
        { status: 400 }
      );
    }

    if (new Date(otpRecord.expires) < new Date()) {
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { success: false, message: 'OTP expired' },
        { status: 400 }
      );
    }

    if (otpRecord.otp !== otp) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.otp.delete({ where: { id: otpRecord.id } });

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated',
    });

  } catch (error) {
    console.error('Password reset verify error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
