import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';
import { z } from 'zod';

const watchBodySchema = z.object({
  cnrNumber: z.string().min(1, 'CNR number is required').max(20, 'Invalid CNR number'),
  notifyDaysBefore: z.number().int().min(1).max(30).optional().default(1),
});

const deleteBodySchema = z.object({
  cnrNumber: z.string().min(1, 'CNR number is required').max(20, 'Invalid CNR number'),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;

  try {
    const body = await request.json();
    const parsed = watchBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { cnrNumber, notifyDaysBefore } = parsed.data;

    const courtCase = await prisma.aPCourtCase.findUnique({
      where: { cnrNumber },
      select: { id: true },
    });

    if (!courtCase) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    const existingWatch = await prisma.aPCaseWatch.findUnique({
      where: {
        userId_courtCaseId: {
          userId: user.userId,
          courtCaseId: courtCase.id,
        },
      },
    });

    if (existingWatch) {
      return NextResponse.json(
        { success: false, error: 'Already watching this case' },
        { status: 409 }
      );
    }

    const watch = await prisma.aPCaseWatch.create({
      data: {
        userId: user.userId,
        courtCaseId: courtCase.id,
        notifyDaysBefore,
      },
    });

    return NextResponse.json({
      success: true,
      data: watch,
    });
  } catch (error) {
    logger.error('Error creating case watch', error);
    return NextResponse.json(
      { success: false, error: 'Failed to watch case' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;

  try {
    const body = await request.json();
    const parsed = deleteBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { cnrNumber } = parsed.data;

    const courtCase = await prisma.aPCourtCase.findUnique({
      where: { cnrNumber },
      select: { id: true },
    });

    if (!courtCase) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    await prisma.aPCaseWatch.deleteMany({
      where: {
        userId: user.userId,
        courtCaseId: courtCase.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Case unwatched' },
    });
  } catch (error) {
    logger.error('Error deleting case watch', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unwatch case' },
      { status: 500 }
    );
  }
}
