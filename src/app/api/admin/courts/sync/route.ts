import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getRequiredEnv } from '@/lib/env';

export async function POST(request: NextRequest) {
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const recentSync = await prisma.aPSyncLog.findFirst({
      where: {
        triggeredBy: 'admin',
        startedAt: { gte: thirtyMinutesAgo },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (recentSync && recentSync.status === 'running') {
      const retryAfter = Math.ceil((30 * 60 * 1000 - (Date.now() - recentSync.startedAt.getTime())) / 1000);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sync already in progress',
          retryAfter,
        },
        { status: 429 }
      );
    }

    runSyncInBackground('admin').catch((err) => {
      logger.error('Background sync failed', err);
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Sync started' },
    });
  } catch (error) {
    logger.error('Error starting admin sync', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}

async function runSyncInBackground(triggeredBy: 'cron' | 'admin') {
  const { runECourtSync } = await import('@/lib/ecourts-sync-ap');
  await runECourtSync({ triggeredBy });
}
