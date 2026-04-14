import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import CaseFilters from './_components/CaseFilters';
import CaseTable from './_components/CaseTable';
import ComingSoonStates from './_components/ComingSoonStates';
import CourtsPageClient from './CourtsPageClient';

interface CourtCase {
  id: string;
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  status: string;
  nextHearingDate: string | null;
  lastHearingDate: string | null;
  petitioner: string;
  respondent: string;
  courtName: string | null;
  districtName: string;
  mandalName: string | null;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default async function CourtsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    redirect('/login');
  }

  const params = await searchParams;
  const districtCode = typeof params.districtCode === 'string' ? params.districtCode : '';
  const mandalCode = typeof params.mandalCode === 'string' ? params.mandalCode : '';
  const caseNumber = typeof params.caseNumber === 'string' ? params.caseNumber : '';
  const cnrNumber = typeof params.cnrNumber === 'string' ? params.cnrNumber : '';
  const petitioner = typeof params.petitioner === 'string' ? params.petitioner : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, parseInt((typeof params.page === 'string' ? params.page : '1'), 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    stateCode: '28',
  };

  if (districtCode) where.districtCode = districtCode;
  if (mandalCode) where.mandalCode = mandalCode;
  if (cnrNumber) where.cnrNumber = cnrNumber;
  if (status) where.status = status;
  if (caseNumber) where.caseNumber = { contains: caseNumber, mode: 'insensitive' };
  if (petitioner) where.petitioner = { contains: petitioner, mode: 'insensitive' };

  const [casesRaw, total, latestSync, watchedCasesRaw] = await Promise.all([
    prisma.aPCourtCase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
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
      },
    }),
    prisma.aPCourtCase.count({ where }),
    prisma.aPSyncLog.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
    prisma.aPCaseWatch.findMany({
      where: { userId: payload.userId },
      select: { courtCase: { select: { cnrNumber: true } } },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const cases: CourtCase[] = casesRaw.map(c => ({
    id: c.id,
    cnrNumber: c.cnrNumber,
    caseNumber: c.caseNumber,
    caseType: c.caseType,
    status: c.status,
    nextHearingDate: c.nextHearingDate ? c.nextHearingDate.toISOString() : null,
    lastHearingDate: c.lastHearingDate ? c.lastHearingDate.toISOString() : null,
    petitioner: c.petitioner,
    respondent: c.respondent,
    courtName: c.courtName,
    districtName: c.districtName,
    mandalName: c.mandalName,
  }));

  const watchedCnrs = new Set(watchedCasesRaw.filter(w => w.courtCase).map(w => w.courtCase.cnrNumber));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">eCourts Cases</h1>
              <p className="text-gray-600">Daily synced court records · Andhra Pradesh</p>
            </div>
            <div className="flex items-center gap-4">
              {latestSync?.completedAt && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  Last synced: {getRelativeTime(latestSync.completedAt)}
                </span>
              )}
              <Link
                href="/courts/calendar"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Hearing calendar →
              </Link>
            </div>
          </div>
        </div>

        <ComingSoonStates />

        <div className="mt-6">
          <CaseFilters />
        </div>

        <div className="mt-6">
          <CourtsPageClient
            cases={cases}
            page={page}
            totalPages={totalPages}
            total={total}
            initialDistrictCode={districtCode}
            initialMandalCode={mandalCode}
            initialCaseNumber={caseNumber}
            initialCnrNumber={cnrNumber}
            initialPetitioner={petitioner}
            initialStatus={status}
            initialWatchedCnrs={Array.from(watchedCnrs)}
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Court data sourced from eCourts India (ecourts.gov.in) · Updated nightly · Data accuracy subject to eCourts API availability
          </p>
        </div>
      </div>
    </div>
  );
}
