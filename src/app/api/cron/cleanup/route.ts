import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (!CRON_SECRET) {
    logger.error('CRON_SECRET environment variable is missing');
    return new NextResponse('Configuration Error', { status: 500 });
  }

  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const providedSecret = authHeader.substring(7);
    
    if (providedSecret !== CRON_SECRET) {
      logger.warn('Invalid cron secret attempted', { 
        ip: request.headers.get('x-forwarded-for') || 'unknown' 
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();

    // Delete expired OTPs
    const deletedOtps = await prisma.otp.deleteMany({
      where: {
        expires: {
          lt: now,
        },
      },
    });

    // Delete expired RateLimits
    const deletedRateLimits = await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedOtps: deletedOtps.count,
      deletedRateLimits: deletedRateLimits.count,
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
