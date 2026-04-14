import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getRequiredEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const cronSecret = getRequiredEnv('CRON_SECRET');

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    runSyncInBackground().catch((err) => {
      logger.error('Cron eCourts sync failed', err);
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error('Error in cron sync endpoint', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}

async function runSyncInBackground() {
  const { runECourtSync } = await import('@/lib/ecourts-sync-ap');
  await runECourtSync({ triggeredBy: 'cron' });
}
