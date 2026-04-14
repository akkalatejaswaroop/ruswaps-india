import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 100;

async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

    const existing = await prisma.rateLimit.findUnique({
      where: { key: identifier },
    });

    if (!existing || existing.windowStart < windowStart) {
      await prisma.rateLimit.upsert({
        where: { key: identifier },
        update: { count: 1, windowStart: now },
        create: { key: identifier, count: 1, windowStart: now },
      });
      return { allowed: true, remaining: MAX_REQUESTS - 1 };
    }

    if (existing.count >= MAX_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }

    await prisma.rateLimit.update({
      where: { key: identifier },
      data: { count: existing.count + 1 },
    });
    return { allowed: true, remaining: MAX_REQUESTS - existing.count - 1 };
  } catch (error) {
    logger.error('Revenue rate limit error', error);
    return { allowed: true, remaining: MAX_REQUESTS };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const rateLimit = await checkRateLimit(`revenue:get:${user.userId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { userId: user.userId };

    if (type && ['legal-fee', 'settlement', 'commission', 'consultation'].includes(type)) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const [entries, total] = await Promise.all([
      prisma.revenueEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.revenueEntry.count({ where }),
    ]);

    const totalRevenue = await prisma.revenueEntry.aggregate({
      where: { userId: user.userId },
      _sum: { amount: true },
    });

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
      },
      summary: {
        totalRevenue: totalRevenue._sum.amount || 0,
        count: total,
      },
    });
  } catch (error) {
    logger.error('Revenue fetch error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const rateLimit = await checkRateLimit(`revenue.post:${user.userId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { caseName, amount, type = 'legal-fee', notes, date } = body;

    if (!caseName || typeof caseName !== 'string' || caseName.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Case name is required' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const validTypes = ['legal-fee', 'settlement', 'commission', 'consultation'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid fee type' },
        { status: 400 }
      );
    }

    const entry = await prisma.revenueEntry.create({
      data: {
        userId: user.userId,
        caseName: caseName.trim().slice(0, 200),
        amount,
        type,
        notes: notes?.trim().slice(0, 500) || null,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Revenue entry added successfully',
    });
  } catch (error) {
    logger.error('Revenue create error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create revenue entry' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const body = await request.json();
    const { id, caseName, amount, type, notes, date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.revenueEntry.findFirst({
      where: { id, userId: user.userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Entry not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (caseName !== undefined) {
      if (typeof caseName !== 'string' || caseName.trim().length === 0) {
        return NextResponse.json(
          { success: false, message: 'Invalid case name' },
          { status: 400 }
        );
      }
      updateData.caseName = caseName.trim().slice(0, 200);
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { success: false, message: 'Invalid amount' },
          { status: 400 }
        );
      }
      updateData.amount = amount;
    }

    const validTypes = ['legal-fee', 'settlement', 'commission', 'consultation'];
    if (type !== undefined) {
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, message: 'Invalid fee type' },
          { status: 400 }
        );
      }
      updateData.type = type;
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim().slice(0, 500) || null;
    }

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    const entry = await prisma.revenueEntry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Revenue entry updated',
    });
  } catch (error) {
    logger.error('Revenue update error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update revenue entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.revenueEntry.findFirst({
      where: { id, userId: user.userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Entry not found' },
        { status: 404 }
      );
    }

    await prisma.revenueEntry.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Revenue entry deleted',
    });
  } catch (error) {
    logger.error('Revenue delete error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete revenue entry' },
      { status: 500 }
    );
  }
}
