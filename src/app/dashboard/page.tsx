import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

interface WatchedCase {
  id: string;
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  status: string;
  nextHearingDate: Date | string | null;
  changedAt: Date | string;
  petitioner: string;
  respondent: string;
  court: string;
}

export default async function Dashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { name: true, isSubscribed: true, subscriptionExpiry: true }
  });

  if (!user) {
    redirect('/login');
  }

  const recentCalculationsRaw = await prisma.calculation.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      resultData: true,
      createdAt: true,
    },
  });

  const recentCalculations = recentCalculationsRaw.map((calc) => ({
    ...calc,
    resultData: calc.resultData as Record<string, unknown>,
  }));

  const calculationCount = await prisma.calculation.count({
    where: { userId: payload.userId },
  });

  const [unreadCount, watchedCasesRaw] = await Promise.all([
    prisma.courtNotification.count({
      where: { userId: payload.userId, isRead: false },
    }),
    prisma.caseWatch.findMany({
      where: { userId: payload.userId },
      include: {
        courtCase: {
          select: {
            id: true,
            cnrNumber: true,
            caseNumber: true,
            caseType: true,
            status: true,
            nextHearingDate: true,
            changedAt: true,
            petitioner: true,
            respondent: true,
            court: true,
          },
        },
      },
      orderBy: {
        courtCase: {
          nextHearingDate: 'asc',
        },
      },
      take: 3,
    }),
  ]);

  const watchedCases: WatchedCase[] = watchedCasesRaw
    .filter(w => w.courtCase)
    .map(w => ({
      id: w.courtCase.id,
      cnrNumber: w.courtCase.cnrNumber,
      caseNumber: w.courtCase.caseNumber,
      caseType: w.courtCase.caseType,
      status: w.courtCase.status,
      nextHearingDate: w.courtCase.nextHearingDate,
      changedAt: w.courtCase.changedAt,
      petitioner: w.courtCase.petitioner,
      respondent: w.courtCase.respondent,
      court: w.courtCase.court,
    }));

  return (
    <DashboardClient
      user={user}
      recentCalculations={recentCalculations}
      calculationCount={calculationCount}
      unreadCount={unreadCount}
      watchedCases={watchedCases}
    />
  );
}
