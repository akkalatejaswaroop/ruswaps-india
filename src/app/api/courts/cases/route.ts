import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';

const CNR_REGEX = /^[A-Z]{2}\d{14}$/;

export async function GET(request: NextRequest) {
  const authResult = await verifyAccessToken(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  const user = authResult.user!;

  try {
    const { searchParams } = new URL(request.url);
    const districtCode = searchParams.get('districtCode');
    const mandalCode = searchParams.get('mandalCode');
    const caseNumber = searchParams.get('caseNumber');
    const cnrNumber = searchParams.get('cnrNumber');
    const petitioner = searchParams.get('petitioner');
    const status = searchParams.get('status');
    let page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '20');

    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);

    const where: Record<string, unknown> = {
      stateCode: '28',
    };

    if (districtCode) {
      where.districtCode = districtCode;
    }

    if (mandalCode) {
      where.mandalCode = mandalCode;
    }

    if (status) {
      where.status = status;
    }

    if (cnrNumber) {
      if (!CNR_REGEX.test(cnrNumber)) {
        return NextResponse.json(
          { success: false, error: 'Invalid CNR number format' },
          { status: 400 }
        );
      }
      where.cnrNumber = cnrNumber;
    }

    if (caseNumber) {
      where.caseNumber = { contains: caseNumber, mode: 'insensitive' };
    }

    if (petitioner) {
      where.petitioner = { contains: petitioner, mode: 'insensitive' };
    }

    const [cases, total] = await Promise.all([
      prisma.aPCourtCase.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          cnrNumber: true,
          caseNumber: true,
          caseType: true,
          status: true,
          nextHearingDate: true,
          lastHearingDate: true,
          petitioner: true,
          respondent: true,
          courtName: true,
          districtName: true,
          mandalName: true,
          updatedAt: true,
        },
      }),
      prisma.aPCourtCase.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        cases,
        total,
        page,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error fetching court cases', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cases' },
      { status: 500 }
    );
  }
}
