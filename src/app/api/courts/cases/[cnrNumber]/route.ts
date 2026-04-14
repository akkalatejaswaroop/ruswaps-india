import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';

const CNR_REGEX = /^[A-Z]{2}\d{14}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cnrNumber: string }> }
) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;
  const { cnrNumber } = await params;

  if (!CNR_REGEX.test(cnrNumber)) {
    return NextResponse.json(
      { success: false, error: 'Invalid CNR number format' },
      { status: 400 }
    );
  }

  try {
    const courtCase = await prisma.aPCourtCase.findUnique({
      where: { cnrNumber },
      include: {
        hearingHistory: {
          orderBy: { hearingDate: 'desc' },
        },
      },
    });

    if (!courtCase) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    const watch = await prisma.aPCaseWatch.findUnique({
      where: {
        userId_courtCaseId: {
          userId: user.userId,
          courtCaseId: courtCase.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        case: courtCase,
        isWatching: !!watch,
        hearingHistory: courtCase.hearingHistory,
      },
    });
  } catch (error) {
    logger.error('Error fetching court case', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch case' },
      { status: 500 }
    );
  }
}
