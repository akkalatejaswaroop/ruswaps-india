import type { Config, Context } from '@netlify/functions';

const AP_DISTRICTS = [
  { code: "745", name: "Alluri Sitharama Raju" },
  { code: "744", name: "Anakapalli" },
  { code: "502", name: "Ananthapuramu" },
  { code: "753", name: "Annamayya" },
  { code: "750", name: "Bapatla" },
  { code: "503", name: "Chittoor" },
  { code: "747", name: "Dr. B.R. Ambedkar Konaseema" },
  { code: "505", name: "East Godavari" },
  { code: "748", name: "Eluru" },
  { code: "506", name: "Guntur" },
  { code: "746", name: "Kakinada" },
  { code: "510", name: "Krishna" },
  { code: "511", name: "Kurnool" },
  { code: "790", name: "Markapuram" },
  { code: "755", name: "Nandyal" },
  { code: "749", name: "NTR" },
  { code: "751", name: "Palnadu" },
  { code: "743", name: "Parvathipuram Manyam" },
  { code: "791", name: "Polavaram" },
  { code: "517", name: "Prakasam" },
  { code: "519", name: "Srikakulam" },
  { code: "515", name: "Sri Potti Sriramulu Nellore" },
  { code: "754", name: "Sri Sathya Sai" },
  { code: "752", name: "Tirupati" },
  { code: "520", name: "Visakhapatnam" },
  { code: "521", name: "Vizianagaram" },
  { code: "523", name: "West Godavari" },
  { code: "504", name: "Y.S.R. Kadapa" },
];

interface RawECourtsCase {
  cnr_number: string;
  case_no: string;
  case_type: string;
  filing_date: string | null;
  registration_date: string | null;
  case_status: string;
  next_hearing_date: string | null;
  last_hearing_date: string | null;
  petitioner_name: string;
  respondent_name: string;
  advocate_name: string | null;
  judge_name: string | null;
  act: string | null;
  section: string | null;
  court_code: string | null;
  court_name: string | null;
  establishment_code: string | null;
  dist_code: string;
  state_code: string;
}

interface RawECourtsHearing {
  hearing_date: string;
  purpose: string | null;
  next_date: string | null;
  order_remarks: string | null;
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

    const data = await response.json();
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

    const data = await response.json();
    return data.hearings || [];
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function runECourtSync(prisma: any) {
  const syncLog = await prisma.aPSyncLog.create({
    data: {
      stateCode: '28',
      startedAt: new Date(),
      status: 'running',
      triggeredBy: 'cron',
    },
  });

  console.log('eCourts AP sync: Starting', { syncLogId: syncLog.id });

  let totalFetched = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    for (const district of AP_DISTRICTS) {
      console.log('eCourts AP sync: Processing district', { districtCode: district.code, districtName: district.name });

      let page = 1;
      const limit = 50;
      let totalPages = 1;

      while (page <= totalPages) {
        const result = await fetchCasesFromAPI(district.code, page, limit);

        if ('error' in result) {
          console.error('API error', result.error, { districtCode: district.code });
          totalErrors++;
          break;
        }

        totalFetched += result.cases.length;
        totalPages = result.totalPages;

        for (const rawCase of result.cases) {
          try {
            const existing = await prisma.aPCourtCase.findUnique({
              where: { cnrNumber: rawCase.cnr_number },
              select: { id: true, status: true, nextHearingDate: true },
            });

            const normalized = {
              cnrNumber: trimString(rawCase.cnr_number) || '',
              caseNumber: trimString(rawCase.case_no) || '',
              caseType: trimString(rawCase.case_type) || '',
              filingDate: parseDate(rawCase.filing_date),
              registrationDate: parseDate(rawCase.registration_date),
              status: trimString(rawCase.case_status) || 'Pending',
              nextHearingDate: parseDate(rawCase.next_hearing_date),
              lastHearingDate: parseDate(rawCase.last_hearing_date),
              petitioner: trimString(rawCase.petitioner_name) || 'Unknown',
              respondent: trimString(rawCase.respondent_name) || 'Unknown',
              advocate: trimString(rawCase.advocate_name),
              judge: trimString(rawCase.judge_name),
              actSection: trimString(rawCase.act) ? `${trimString(rawCase.act)} - ${trimString(rawCase.section)}` : trimString(rawCase.section),
              stateCode: '28',
              stateName: 'Andhra Pradesh',
              districtCode: trimString(rawCase.dist_code) || '',
              districtName: district.name,
              mandalCode: null,
              mandalName: null,
              courtCode: trimString(rawCase.court_code),
              courtName: trimString(rawCase.court_name),
              establishmentCode: trimString(rawCase.establishment_code),
              rawData: rawCase as object,
              syncedAt: new Date(),
              changedAt: new Date(),
            };

            if (!existing) {
              await prisma.aPCourtCase.create({ data: normalized });
              totalUpdated++;
            } else if (
              existing.status !== normalized.status ||
              existing.nextHearingDate?.getTime() !== normalized.nextHearingDate?.getTime()
            ) {
              await prisma.aPCourtCase.update({
                where: { cnrNumber: normalized.cnrNumber },
                data: { ...normalized, changedAt: new Date() },
              });
              totalUpdated++;

              const watches = await prisma.aPCaseWatch.findMany({
                where: { courtCaseId: existing.id },
                select: { userId: true },
              });

              for (const watch of watches) {
                await prisma.aPCourtNotification.create({
                  data: {
                    userId: watch.userId,
                    courtCaseId: existing.id,
                    type: normalized.status === 'Disposed' ? 'disposed' : 'status_changed',
                    message: normalized.status === 'Disposed' 
                      ? 'Case has been disposed' 
                      : 'Hearing date changed',
                    isRead: false,
                  },
                });
              }
            } else {
              totalSkipped++;
            }

            const hearingsResult = await fetchHearingHistory(normalized.cnrNumber);
            if (!('error' in hearingsResult)) {
              for (const hearing of hearingsResult) {
                const hearingDate = parseDate(hearing.hearing_date);
                if (hearingDate) {
                  await prisma.aPCaseHearing.upsert({
                    where: { id: `${existing.id}-${hearingDate.getTime()}` },
                    create: {
                      id: `${existing.id}-${hearingDate.getTime()}`,
                      courtCaseId: existing.id,
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
                }
              }
            }
          } catch (err: any) {
            console.error('Error processing case', err?.message, { cnr: rawCase.cnr_number });
            totalErrors++;
          }
        }
        page++;
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

    console.log('eCourts AP sync: Completed', { syncLogId: syncLog.id, totalFetched, totalUpdated, totalErrors });

    return { success: true, totalFetched, totalUpdated, totalErrors };
  } catch (error: any) {
    console.error('eCourts AP sync: Failed', error);

    await prisma.aPSyncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'failed',
        totalFetched,
        totalUpdated,
        totalSkipped,
        totalErrors: totalErrors + 1,
        errorDetails: { error: error?.message || 'Unknown error' },
      },
    });

    return { success: false, totalFetched, totalUpdated, totalErrors: totalErrors + 1 };
  }
}

export default async (req: Request, context: Context) => {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('eCourts cron sync triggered');

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '&connection_limit=1',
      },
    },
  });

  runECourtSync(prisma).catch((err: any) => {
    console.error('Background sync failed', err);
  }).finally(() => {
    prisma.$disconnect();
  });

  return new Response(JSON.stringify({ success: true, message: 'Sync initiated' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config: Config = {
  schedule: "0 23 * * *"
};
