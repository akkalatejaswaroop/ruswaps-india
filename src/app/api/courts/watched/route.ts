import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;

  try {
    const watchedCases = await prisma.aPCaseWatch.findMany({
      where: { userId: user.userId },
      select: {
        courtCase: {
          select: {
            id: true,
            cnrNumber: true,
            caseNumber: true,
            courtName: true,
            districtName: true,
            status: true,
            nextHearingDate: true,
            changedAt: true,
          },
        },
        notifyDaysBefore: true,
        createdAt: true,
      },
      orderBy: { courtCase: { nextHearingDate: 'asc' } },
    });

    const cases = watchedCases
      .map((w) => ({
        id: w.courtCase.id,
        cnrNumber: w.courtCase.cnrNumber,
        caseNumber: w.courtCase.caseNumber,
        courtName: w.courtCase.courtName,
        districtName: w.courtCase.districtName,
        status: w.courtCase.status,
        nextHearingDate: w.courtCase.nextHearingDate,
        changedAt: w.courtCase.changedAt,
        notifyDaysBefore: w.notifyDaysBefore,
        watchedAt: w.createdAt,
      }))
      .sort((a, b) => {
        if (!a.nextHearingDate && !b.nextHearingDate) return 0;
        if (!a.nextHearingDate) return 1;
        if (!b.nextHearingDate) return -1;
        return a.nextHearingDate.getTime() - b.nextHearingDate.getTime();
      });

    return NextResponse.json({
      success: true,
      data: cases,
    });
  } catch (error) {
    logger.error('Error fetching watched cases', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watched cases' },
      { status: 500 }
    );
  }
}
