import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Verification ID is required' }, { status: 400 });
    }

    const calculation = await prisma.calculation.findUnique({
      where: { verificationId: id },
      include: {
        user: {
          select: {
            name: true,
            isSubscribed: true,
          }
        }
      }
    });

    if (!calculation || !calculation.isVerified) {
      return NextResponse.json({ success: false, message: 'Invalid or unverified report' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: calculation.id,
        type: calculation.type,
        userName: calculation.user.name,
        verifiedAt: calculation.createdAt,
        isVerified: true,
        verificationId: calculation.verificationId,
        inputData: calculation.inputData,
        resultData: calculation.resultData,
      }
    });

  } catch (error) {
    logger.error('Verification route error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
