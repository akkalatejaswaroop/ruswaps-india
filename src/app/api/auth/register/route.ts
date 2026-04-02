import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateAccessToken, generateRefreshToken, cookieOptions, refreshCookieOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/email';

const otpStore = new Map<string, { otp: string; expires: number; name: string; email: string; password: string }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, password } = body;

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

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 409 }
      );
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPassword = await hashPassword(password);

    otpStore.set(phone, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
      name,
      email,
      password: hashedPassword,
    });

    await sendOTPEmail(email, otp, name);

    console.log(`OTP for ${phone}: ${otp}`);

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
    const { phone, email } = body;

    if (!phone || !email) {
      return NextResponse.json(
        { success: false, message: 'Phone and email are required' },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 409 }
      );
    }

    const stored = otpStore.get(phone);
    
    if (stored && Date.now() < stored.expires) {
      await sendOTPEmail(stored.email, stored.otp, stored.name);
      console.log(`OTP for ${phone}: ${stored.otp}`);
      return NextResponse.json({
        success: true,
        message: 'OTP resent to email',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Please register again to get new OTP',
    }, { status: 400 });

  } catch (error) {
    console.error('OTP resend error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resend OTP' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const otp = searchParams.get('otp');

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, message: 'Phone and OTP are required' },
        { status: 400 }
      );
    }

    const stored = otpStore.get(phone);

    if (!stored) {
      return NextResponse.json(
        { success: false, message: 'OTP not found or expired' },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(phone);
      return NextResponse.json(
        { success: false, message: 'OTP expired' },
        { status: 400 }
      );
    }

    if (stored.otp !== otp) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP' },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: stored.name,
        phone,
        email: stored.email,
        password: stored.password,
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

    otpStore.delete(phone);

    const accessToken = generateAccessToken({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
    });

    const refreshToken = generateRefreshToken({
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
