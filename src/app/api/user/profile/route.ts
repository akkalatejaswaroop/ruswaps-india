import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, comparePassword } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth-helpers';
import { revokeAllUserTokens } from '@/lib/token-revocation';
import { logger } from '@/lib/logger';
import { validateCSRFToken, CSRF_HEADER_NAME } from '@/lib/csrf';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 5;

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
    logger.error('Rate limit check error', error);
    return false;
  }
}

function sanitizeString(str: unknown, maxLength: number = 255): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(sanitized) ? sanitized.slice(0, 255) : '';
}

function sanitizePlayerId(playerId: unknown): string {
  if (typeof playerId !== 'string') return '';
  return playerId.trim().slice(0, 100);
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const rateLimitCheck = await checkRateLimit(`profile:get:${user.userId}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        isSubscribed: true,
        subscriptionExpiry: true,
        createdAt: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: userData });

  } catch (error) {
    logger.error('Get profile error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const csrfValid = await validateCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    const rateLimitCheck = await checkRateLimit(`profile:put:${user.userId}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { name, email, playerId } = body;

    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) {
      const sanitizedName = sanitizeString(name, 100);
      if (sanitizedName.length < 1) {
        return NextResponse.json({ success: false, message: 'Invalid name' }, { status: 400 });
      }
      updateData.name = sanitizedName;
    }
    
    if (email !== undefined) {
      const sanitizedEmail = sanitizeEmail(email);
      if (!sanitizedEmail) {
        return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
      }
      updateData.email = sanitizedEmail;
    }
    
    if (playerId !== undefined) {
      updateData.playerId = sanitizePlayerId(playerId);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No valid fields to update' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser, message: 'Profile updated successfully' });

  } catch (error) {
    logger.error('Update profile error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const csrfValid = await validateCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    const rateLimitCheck = await checkRateLimit(`profile:password:${user.userId}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'Current and new password are required' }, { status: 400 });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ success: false, message: passwordValidation.error }, { status: 400 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { password: true },
    });

    if (!userData) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const isValid = await comparePassword(currentPassword, userData.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.userId },
        data: { 
          password: hashedPassword,
          lastPasswordChange: new Date(),
        },
      });
    });

    logger.info('Password changed, all tokens revoked', { userId: user.userId });

    const response = NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully. Please login again.' 
    });

    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;

  } catch (error) {
    logger.error('Change password error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
