import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken, generateRefreshToken, cookieOptions, refreshCookieOptions } from '@/lib/auth';
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
    const { name, phone, email, password } = body;
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (!name || !phone || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number' },
        { status: 400 }
      );
    }

    if (!checkRateLimit(`${clientIp}:${phone}`)) {
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
        { success: false, message: 'User already exists' },
        { status: 409 }
      );
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp.upsert({
      where: { phone_purpose: { phone, purpose: 'register' } },
      update: { otp, email, expires, createdAt: new Date() },
      create: { phone, email, otp, expires, purpose: 'register' },
    });

    await sendOTPEmail(email, otp, name);

    return NextResponse.json({
      success: true,
      message: 'OTP sent to email',
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

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

    if (!checkRateLimit(`resend:${clientIp}:${phone}`)) {
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

    await sendOTPEmail(otpRecord.email, otpRecord.otp, '');

    return NextResponse.json({
      success: true,
      message: 'OTP resent to email',
    });

  } catch (error) {
    console.error('OTP resend error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resend OTP' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp, name, password } = body;

    if (!phone || !otp || !name || !password) {
      return NextResponse.json(
        { success: false, message: 'Phone and OTP are required' },
        { status: 400 }
      );
    }

    const otpRecord = await prisma.otp.findUnique({
      where: { phone_purpose: { phone, purpose: 'register' } },
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
        accessToken,
      },
      message: 'Registration successful',
    });

    response.cookies.set('accessToken', accessToken, cookieOptions);
    response.cookies.set('refreshToken', refreshToken, refreshCookieOptions);

    return response;

  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}