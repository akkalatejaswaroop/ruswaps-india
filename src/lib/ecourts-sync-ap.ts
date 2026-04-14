import { prisma } from './prisma';
import { logger } from './logger';
import { AP_DISTRICTS } from '../../prisma/seeds/ap-locations';
import type { RawECourtsCase, RawECourtsHearing } from '@/types/ecourts';

interface SyncOptions {
  triggeredBy: 'cron' | 'admin';
}

interface SyncResult {
  success: boolean;
  totalFetched: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  errorDetails: Record<string, unknown> | null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function trimString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeCase(raw: RawECourtsCase, districtName: string): {
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  filingDate: Date | null;
  registrationDate: Date | null;
  status: string;
  nextHearingDate: Date | null;
  lastHearingDate: Date | null;
  petitioner: string;
  respondent: string;
  advocate: string | null;
  judge: string | null;
  actSection: string | null;
  stateCode: string;
  stateName: string;
  districtCode: string;
  districtName: string;
  mandalCode: string | null;
  mandalName: string | null;
  courtCode: string | null;
  courtName: string | null;
  establishmentCode: string | null;
  rawData: object;
  syncedAt: Date;
  changedAt: Date;
} {
  return {
    cnrNumber: trimString(raw.cnr_number) || '',
    caseNumber: trimString(raw.case_no) || '',
    caseType: trimString(raw.case_type) || '',
    filingDate: parseDate(raw.filing_date),
    registrationDate: parseDate(raw.registration_date),
    status: trimString(raw.case_status) || 'Pending',
    nextHearingDate: parseDate(raw.next_hearing_date),
    lastHearingDate: parseDate(raw.last_hearing_date),
    petitioner: trimString(raw.petitioner_name) || 'Unknown',
    respondent: trimString(raw.respondent_name) || 'Unknown',
    advocate: trimString(raw.advocate_name),
    judge: trimString(raw.judge_name),
    actSection: (() => {
      const act = trimString(raw.act);
      const section = trimString(raw.section);
      if (!act && !section) return null;
      if (!act) return section;
      if (!section) return act;
      return `${act} - ${section}`;
    })(),
    stateCode: '28',
    stateName: 'Andhra Pradesh',
    districtCode: trimString(raw.dist_code) || '',
    districtName,
    mandalCode: null,
    mandalName: null,
    courtCode: trimString(raw.court_code),
    courtName: trimString(raw.court_name),
    establishmentCode: trimString(raw.establishment_code),
    rawData: raw,
    syncedAt: new Date(),
    changedAt: new Date(),
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCasesFromAPI(
  districtCode: string,
  page: number,
  limit = 50
): Promise<{ cases: RawECourtsCase[]; totalPages: number } | { error: string }> {
  await sleep(400);

  const apiKey = process.env.ECOURTS_API_KEY;
  const baseUrl = process.env.ECOURTS_API_BASE_URL || 'https://apis.ecourts.gov.in/public';

  if (!apiKey) {
    return { error: 'ECourts API key not configured' };
  }

  try {
    const url = `${baseUrl}/v1/cases?state_code=28&dist_code=${districtCode}&page=${page}&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'auth-token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json() as { cases?: RawECourtsCase[]; total_pages?: number };
    return {
      cases: data.cases || [],
      totalPages: data.total_pages || 1,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function fetchHearingHistory(cnrNumber: string): Promise<RawECourtsHearing[] | { error: string }> {
  await sleep(400);

  const apiKey = process.env.ECOURTS_API_KEY;
  const baseUrl = process.env.ECOURTS_API_BASE_URL || 'https://apis.ecourts.gov.in/public';

  if (!apiKey) {
    return { error: 'ECourts API key not configured' };
  }

  try {
    const url = `${baseUrl}/v1/case/cnr/${cnrNumber}/orders`;
    
    const response = await fetch(url, {
      headers: {
        'auth-token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json() as { hearings?: RawECourtsHearing[] };
    return data.hearings || [];
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function hasChanges(
  existing: { status: string; nextHearingDate: Date | null; judge: string | null; advocate: string | null },
  normalized: { status: string; nextHearingDate: Date | null; judge: string | null; advocate: string | null }
): boolean {
  return (
    existing.status !== normalized.status ||
    (existing.nextHearingDate?.getTime() || 0) !== (normalized.nextHearingDate?.getTime() || 0) ||
    existing.judge !== normalized.judge ||
    existing.advocate !== normalized.advocate
  );
}

function determineNotificationType(
  status: string,
  nextHearingDate: Date | null,
  changes: boolean
): { type: string; message: string } | null {
  if (!changes) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  if (status === 'Disposed') {
    return { type: 'disposed', message: `Case has been disposed` };
  }

  if (nextHearingDate) {
    const hearingDate = new Date(nextHearingDate);
    hearingDate.setHours(0, 0, 0, 0);

    if (hearingDate.getTime() === tomorrow.getTime()) {
      return { type: 'hearing_tomorrow', message: `Hearing scheduled for tomorrow` };
    }
  }

  return { type: 'date_changed', message: `Hearing date changed` };
}

async function processCase(
  rawCase: RawECourtsCase,
  districtName: string,
  syncLogId: string
): Promise<{ updated: boolean; skipped: boolean; error: string | null }> {
  try {
    const normalized = normalizeCase(rawCase, districtName);

    const existingCase = await prisma.aPCourtCase.findUnique({
      where: { cnrNumber: normalized.cnrNumber },
      select: {
        id: true,
        status: true,
        nextHearingDate: true,
        judge: true,
        advocate: true,
      },
    });

    if (!existingCase) {
      const created = await prisma.aPCourtCase.create({
        data: normalized,
      });

      const hearingsResult = await fetchHearingHistory(normalized.cnrNumber);
      if (!('error' in hearingsResult)) {
        await upsertHearingHistory(created.id, hearingsResult);
      }

      return { updated: true, skipped: false, error: null };
    }

    const changed = hasChanges(
      {
        status: existingCase.status,
        nextHearingDate: existingCase.nextHearingDate,
        judge: existingCase.judge,
        advocate: existingCase.advocate,
      },
      {
        status: normalized.status,
        nextHearingDate: normalized.nextHearingDate,
        judge: normalized.advocate,
        advocate: normalized.advocate,
      }
    );

    if (!changed) {
      await prisma.aPCourtCase.update({
        where: { cnrNumber: normalized.cnrNumber },
        data: { syncedAt: new Date() },
      });
      return { updated: false, skipped: true, error: null };
    }

    normalized.changedAt = new Date();

    await prisma.aPCourtCase.update({
      where: { cnrNumber: normalized.cnrNumber },
      data: normalized,
    });

    const hearingsResult = await fetchHearingHistory(normalized.cnrNumber);
    if (!('error' in hearingsResult)) {
      await upsertHearingHistory(existingCase.id, hearingsResult);
    }

    const notificationInfo = determineNotificationType(
      normalized.status,
      normalized.nextHearingDate,
      changed
    );

    if (notificationInfo) {
      const watches = await prisma.aPCaseWatch.findMany({
        where: { courtCaseId: existingCase.id },
        select: { userId: true, notifyDaysBefore: true },
      });

      for (const watch of watches) {
        await prisma.aPCourtNotification.create({
          data: {
            userId: watch.userId,
            courtCaseId: existingCase.id,
            type: notificationInfo.type,
            message: notificationInfo.message,
            isRead: false,
          },
        });
      }
    }

    return { updated: true, skipped: false, error: null };
  } catch (error) {
    logger.error('Error processing case', error, { cnr: rawCase.cnr_number });
    return { updated: false, skipped: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function upsertHearingHistory(courtCaseId: string, hearings: RawECourtsHearing[]): Promise<void> {
  for (const hearing of hearings) {
    const hearingDate = parseDate(hearing.hearing_date);
    if (!hearingDate) continue;

    try {
      await prisma.aPCaseHearing.upsert({
        where: {
          id: `${courtCaseId}-${hearingDate.getTime()}`,
        },
        create: {
          id: `${courtCaseId}-${hearingDate.getTime()}`,
          courtCaseId,
          hearingDate,
          purpose: trimString(hearing.purpose),
          nextDate: parseDate(hearing.next_date),
          orderRemarks: trimString(hearing.order_remarks),
        },
        update: {
          purpose: trimString(hearing.purpose),
          nextDate: parseDate(hearing.next_date),
          orderRemarks: trimString(hearing.order_remarks),
        },
      });
    } catch (err) {
      logger.error('Error upserting hearing', err, { courtCaseId });
    }
  }
}

async function processDistrict(
  districtCode: string,
  districtName: string,
  syncLogId: string
): Promise<{ fetched: number; updated: number; skipped: number; errors: number }> {
  let page = 1;
  const limit = 50;
  let fetched = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchCasesFromAPI(districtCode, page, limit);

    if ('error' in result) {
      logger.error('API error fetching district cases', result.error, { districtCode, page });
      errors += 1;
      break;
    }

    fetched += result.cases.length;
    totalPages = result.totalPages;

    for (const rawCase of result.cases) {
      const processResult = await processCase(rawCase, districtName, syncLogId);
      
      if (processResult.error) {
        errors += 1;
      } else if (processResult.skipped) {
        skipped += 1;
      } else if (processResult.updated) {
        updated += 1;
      }
    }

    page += 1;
  }

  return { fetched, updated, skipped, errors };
}

export async function runECourtSync(options: SyncOptions): Promise<SyncResult> {
  const syncLog = await prisma.aPSyncLog.create({
    data: {
      stateCode: '28',
      startedAt: new Date(),
      status: 'running',
      triggeredBy: options.triggeredBy,
    },
  });

  logger.info('eCourts AP sync: Starting', { syncLogId: syncLog.id });

  let totalFetched = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const errorDetails: Record<string, unknown> = {};

  try {
    for (const district of AP_DISTRICTS) {
      logger.info('eCourts AP sync: Processing district', { districtCode: district.code, districtName: district.name });

      try {
        const result = await processDistrict(district.code, district.name, syncLog.id);
        totalFetched += result.fetched;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;
        totalErrors += result.errors;

        await prisma.aPSyncLog.update({
          where: { id: syncLog.id },
          data: {
            totalFetched,
            totalUpdated,
            totalSkipped,
            totalErrors,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error processing district', error, { districtCode: district.code });
        errorDetails[district.code] = errorMessage;
        totalErrors += 1;
      }
    }

    await prisma.aPSyncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'completed',
        totalFetched,
        totalUpdated,
        totalSkipped,
        totalErrors,
      },
    });

    logger.info('eCourts AP sync: Completed', {
      syncLogId: syncLog.id,
      fetched: totalFetched,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: totalErrors,
    });

    return {
      success: totalErrors === 0,
      totalFetched,
      totalUpdated,
      totalSkipped,
      totalErrors,
      errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('eCourts AP sync: Failed', error);

    await prisma.aPSyncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'failed',
        totalFetched,
        totalUpdated,
        totalSkipped,
        totalErrors: totalErrors + 1,
        errorDetails: { error: errorMessage, ...errorDetails },
      },
    });

    return {
      success: false,
      totalFetched,
      totalUpdated,
      totalSkipped,
      totalErrors: totalErrors + 1,
      errorDetails: { error: errorMessage, ...errorDetails },
    };
  }
}
