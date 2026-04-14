import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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
    const logs = await prisma.aPSyncLog.findMany({
      take: 20,
      orderBy: { startedAt: 'desc' },
    });

    const logsWithDuration = logs.map((log) => {
      const durationSeconds = log.completedAt
        ? Math.floor((log.completedAt.getTime() - log.startedAt.getTime()) / 1000)
        : null;
      return {
        ...log,
        durationSeconds,
      };
    });

    return NextResponse.json({
      success: true,
      data: logsWithDuration,
    });
  } catch (error) {
    logger.error('Error fetching sync logs', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sync logs' },
      { status: 500 }
    );
  }
}
