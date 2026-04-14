import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import CourtCaseDetailClient from './page-client';

interface PageProps {
  params: Promise<{ cnrNumber: string }>;
}

export default async function CourtCaseDetailPage({ params }: PageProps) {
  const { cnrNumber } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  let userId: string | null = null;
  if (token) {
    const payload = await verifyToken(token);
    userId = payload?.userId || null;
  }

  const courtCase = await prisma.aPCourtCase.findUnique({
    where: { cnrNumber },
    include: {
      hearingHistory: {
        orderBy: { hearingDate: 'desc' },
      },
    },
  });

  if (!courtCase) {
    notFound();
  }

  let isWatching = false;
  if (userId) {
    const watch = await prisma.aPCaseWatch.findUnique({
      where: {
        userId_courtCaseId: {
          userId,
          courtCaseId: courtCase.id,
        },
      },
    });
    isWatching = !!watch;
  }

  const courtCaseData = {
    id: courtCase.id,
    cnrNumber: courtCase.cnrNumber,
    caseNumber: courtCase.caseNumber,
    caseType: courtCase.caseType,
    status: courtCase.status,
    filingDate: courtCase.filingDate?.toISOString() || null,
    registrationDate: courtCase.registrationDate?.toISOString() || null,
    nextHearingDate: courtCase.nextHearingDate?.toISOString() || null,
    lastHearingDate: courtCase.lastHearingDate?.toISOString() || null,
    petitioner: courtCase.petitioner,
    respondent: courtCase.respondent,
    advocate: courtCase.advocate,
    judge: courtCase.judge,
    actSection: courtCase.actSection,
    courtName: courtCase.courtName,
    stateName: courtCase.stateName,
    districtCode: courtCase.districtCode,
    districtName: courtCase.districtName,
    mandalCode: courtCase.mandalCode,
    mandalName: courtCase.mandalName,
    syncedAt: courtCase.syncedAt.toISOString(),
  };

  const hearingHistory = courtCase.hearingHistory.map(h => ({
    id: h.id,
    hearingDate: h.hearingDate.toISOString(),
    purpose: h.purpose,
    nextDate: h.nextDate?.toISOString() || null,
    orderRemarks: h.orderRemarks,
  }));

  return (
    <CourtCaseDetailClient
      courtCase={courtCaseData}
      hearingHistory={hearingHistory}
      isWatching={isWatching}
    />
  );
}
