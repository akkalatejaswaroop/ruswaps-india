import { z } from 'zod';
import { getOptionalEnv } from './env';
import { logger } from './logger';
import { prisma } from './prisma';
import { ecourtsClient, ECourtCase, ECourtOrder, ApiResult } from './ecourts-client';

const STATE_DISTRICT_CODES: Record<string, string[]> = {
  AP: ['020', '021', '022', '023', '024', '025', '026', '027', '028', '029', '030', '031', '032', '033', '034'],
  TS: ['040', '041', '042', '043', '044', '045', '046', '047', '048', '049', '050', '051', '052', '053', '054'],
  KA: ['010', '011', '012', '013', '014', '015', '016', '017', '018', '019', '030', '031', '032', '033'],
  DL: ['051', '052', '053', '054', '055'],
  MH: ['060', '061', '062', '063', '064', '065', '066', '067', '068', '069', '070', '071', '072'],
  TN: ['080', '081', '082', '083', '084', '085', '086', '087', '088', '089', '090'],
  UP: ['100', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111'],
  WB: ['120', '121', '122', '123', '124', '125', '126', '127', '128'],
  GJ: ['140', '141', '142', '143', '144', '145', '146', '147', '148', '149'],
  RJ: ['150', '151', '152', '153', '154', '155', '156', '157', '158', '159'],
  MP: ['170', '171', '172', '173', '174', '175', '176', '177', '178', '179'],
};

const courtCaseSchema = z.object({
  cnrNumber: z.string(),
  caseNumber: z.string(),
  caseType: z.string(),
  filingDate: z.date().nullable().optional(),
  registrationDate: z.date().nullable().optional(),
  status: z.string(),
  nextHearingDate: z.date().nullable().optional(),
  lastHearingDate: z.date().nullable().optional(),
  petitioner: z.string(),
  respondent: z.string(),
  advocate: z.string().nullable().optional(),
  judge: z.string().nullable().optional(),
  actSection: z.string().nullable().optional(),
  court: z.string(),
  state: z.string(),
  district: z.string(),
  taluka: z.string().nullable().optional(),
  establishmentCode: z.string().nullable().optional(),
  courtCode: z.string().nullable().optional(),
  rawData: z.any(),
  syncedAt: z.date(),
  changedAt: z.date(),
});

type CourtCaseInput = z.infer<typeof courtCaseSchema>;

export interface SyncConfig {
  states: string[];
  triggeredBy: 'cron' | 'admin';
}

export interface SyncResult {
  success: boolean;
  totalFetched: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  errorDetails: Record<string, unknown> | null;
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  try {
    return new Date(value);
  } catch {
    return null;
  }
}

function normalizeCourtCase(apiCase: ECourtCase): CourtCaseInput {
  return {
    cnrNumber: apiCase.cnr_number,
    caseNumber: apiCase.case_number,
    caseType: apiCase.case_type,
    filingDate: parseDate(apiCase.filing_date),
    registrationDate: parseDate(apiCase.registration_date),
    status: apiCase.status || 'Pending',
    nextHearingDate: parseDate(apiCase.next_hearing_date),
    lastHearingDate: parseDate(apiCase.last_hearing_date),
    petitioner: apiCase.petitioner || 'Unknown',
    respondent: apiCase.respondent || 'Unknown',
    advocate: apiCase.advocate || null,
    judge: apiCase.judge || null,
    actSection: apiCase.act_section || null,
    court: apiCase.court_name || 'Unknown',
    state: apiCase.state_code || 'Unknown',
    district: apiCase.district_code || 'Unknown',
    taluka: apiCase.taluka || null,
    establishmentCode: apiCase.establishment_code || null,
    courtCode: apiCase.court_code || null,
    rawData: apiCase,
    syncedAt: new Date(),
    changedAt: new Date(),
  };
}

function parseApiOrder(apiOrder: ECourtOrder) {
  return {
    hearingDate: parseDate(apiOrder.hearing_date) || new Date(),
    purpose: apiOrder.purpose || null,
    nextDate: parseDate(apiOrder.next_date),
    order: apiOrder.order || null,
  };
}

async function diffAndNotify(
  existingCase: { status: string; nextHearingDate: Date | null; judge: string | null; advocate: string | null },
  newCase: CourtCaseInput
): Promise<string[]> {
  const changes: string[] = [];

  if (existingCase.status !== newCase.status) {
    changes.push('status');
  }
  if (
    (existingCase.nextHearingDate?.getTime() || 0) !== (newCase.nextHearingDate?.getTime() || 0)
  ) {
    changes.push('nextHearingDate');
  }
  if (existingCase.judge !== newCase.judge) {
    changes.push('judge');
  }
  if (existingCase.advocate !== newCase.advocate) {
    changes.push('advocate');
  }

  return changes;
}

async function createNotification(
  userId: string,
  courtCaseId: string,
  caseNumber: string,
  changeTypes: string[]
): Promise<void> {
  const now = new Date();
  let type: string;
  let message: string;

  if (changeTypes.includes('status')) {
    type = 'status_changed';
    message = `Case ${caseNumber} status has been updated`;
  } else if (changeTypes.includes('nextHearingDate')) {
    type = 'date_changed';
    message = `Case ${caseNumber} hearing date has been changed`;
  } else {
    type = 'status_changed';
    message = `Case ${caseNumber} details have been updated`;
  }

  await prisma.courtNotification.create({
    data: {
      userId,
      courtCaseId,
      type,
      message,
      isRead: false,
    },
  });
}

async function processCase(
  apiCase: ECourtCase,
  syncLogId: string
): Promise<{ updated: boolean; error: string | null }> {
  try {
    const normalized = normalizeCourtCase(apiCase);
    const existingCase = await prisma.courtCase.findUnique({
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
      await prisma.courtCase.create({
        data: {
          cnrNumber: normalized.cnrNumber,
          caseNumber: normalized.caseNumber,
          caseType: normalized.caseType,
          filingDate: normalized.filingDate,
          registrationDate: normalized.registrationDate,
          status: normalized.status,
          nextHearingDate: normalized.nextHearingDate,
          lastHearingDate: normalized.lastHearingDate,
          petitioner: normalized.petitioner,
          respondent: normalized.respondent,
          advocate: normalized.advocate,
          judge: normalized.judge,
          actSection: normalized.actSection,
          court: normalized.court,
          state: normalized.state,
          district: normalized.district,
          taluka: normalized.taluka,
          establishmentCode: normalized.establishmentCode,
          courtCode: normalized.courtCode,
          rawData: normalized.rawData,
          syncedAt: normalized.syncedAt,
          changedAt: normalized.changedAt,
        },
      });
      return { updated: true, error: null };
    }

    const changes = await diffAndNotify(
      {
        status: existingCase.status,
        nextHearingDate: existingCase.nextHearingDate,
        judge: existingCase.judge,
        advocate: existingCase.advocate,
      },
      normalized
    );

    const hasDateChange = changes.includes('nextHearingDate');
    const hasStatusChange = changes.includes('status');

    let notificationType: string | null = null;
    if (hasStatusChange && normalized.status === 'Disposed') {
      notificationType = 'disposed';
    } else if (hasDateChange && normalized.nextHearingDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hearingDate = normalized.nextHearingDate;
      if (
        hearingDate.getFullYear() === tomorrow.getFullYear() &&
        hearingDate.getMonth() === tomorrow.getMonth() &&
        hearingDate.getDate() === tomorrow.getDate()
      ) {
        notificationType = 'hearing_tomorrow';
      } else {
        notificationType = 'date_changed';
      }
    } else if (changes.length > 0) {
      notificationType = 'status_changed';
    }

    if (changes.length > 0) {
      normalized.changedAt = new Date();
    }

    await prisma.courtCase.update({
      where: { cnrNumber: normalized.cnrNumber },
      data: {
        caseNumber: normalized.caseNumber,
        caseType: normalized.caseType,
        filingDate: normalized.filingDate,
        registrationDate: normalized.registrationDate,
        status: normalized.status,
        nextHearingDate: normalized.nextHearingDate,
        lastHearingDate: normalized.lastHearingDate,
        petitioner: normalized.petitioner,
        respondent: normalized.respondent,
        advocate: normalized.advocate,
        judge: normalized.judge,
        actSection: normalized.actSection,
        court: normalized.court,
        state: normalized.state,
        district: normalized.district,
        taluka: normalized.taluka,
        establishmentCode: normalized.establishmentCode,
        courtCode: normalized.courtCode,
        rawData: normalized.rawData,
        syncedAt: normalized.syncedAt,
        changedAt: normalized.changedAt,
      },
    });

    if (notificationType) {
      const watches = await prisma.caseWatch.findMany({
        where: { courtCaseId: existingCase.id },
        select: { userId: true },
      });

      for (const watch of watches) {
        let message = '';
        switch (notificationType) {
          case 'disposed':
            message = `Case ${normalized.caseNumber} has been disposed`;
            break;
          case 'hearing_tomorrow':
            message = `Case ${normalized.caseNumber} hearing is tomorrow`;
            break;
          case 'date_changed':
            message = `Case ${normalized.caseNumber} hearing date has changed`;
            break;
          default:
            message = `Case ${normalized.caseNumber} status updated`;
        }

        await prisma.courtNotification.create({
          data: {
            userId: watch.userId,
            courtCaseId: existingCase.id,
            type: notificationType,
            message,
            isRead: false,
          },
        });
      }
    }

    const ordersResult = await ecourtsClient.fetchHearingHistory(normalized.cnrNumber);
    if (ordersResult.data && ordersResult.data.data) {
      for (const order of ordersResult.data.data) {
        const parsedOrder = parseApiOrder(order);
        await prisma.caseOrder.upsert({
          where: {
            id: `${existingCase.id}-${parsedOrder.hearingDate.getTime()}`,
          },
          create: {
            courtCaseId: existingCase.id,
            hearingDate: parsedOrder.hearingDate,
            purpose: parsedOrder.purpose,
            nextDate: parsedOrder.nextDate,
            order: parsedOrder.order,
          },
          update: {
            purpose: parsedOrder.purpose,
            nextDate: parsedOrder.nextDate,
            order: parsedOrder.order,
          },
        });
      }
    }

    return { updated: changes.length > 0, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error processing case', error, { cnrNumber: apiCase.cnr_number });
    return { updated: false, error: errorMessage };
  }
}

async function processDistrict(
  stateCode: string,
  districtCode: string,
  syncLogId: string
): Promise<{ fetched: number; updated: number; errors: number }> {
  let page = 1;
  const pageSize = 50;
  let fetched = 0;
  let updated = 0;
  let errors = 0;

  while (true) {
    const result = await ecourtsClient.fetchCasesByDistrict(stateCode, districtCode, page, pageSize);

    if (result.error) {
      logger.error('API error fetching district cases', result.error, { stateCode, districtCode, page });
      errors += 1;
      break;
    }

    if (!result.data || !result.data.data || result.data.data.length === 0) {
      break;
    }

    fetched += result.data.data.length;

    for (const courtCase of result.data.data) {
      const processResult = await processCase(courtCase, syncLogId);
      if (processResult.error) {
        errors += 1;
      } else if (processResult.updated) {
        updated += 1;
      }
    }

    if (result.data.data.length < pageSize) {
      break;
    }

    page += 1;
  }

  return { fetched, updated, errors };
}

export async function runECourtSync(config: SyncConfig): Promise<SyncResult> {
  if (!ecourtsClient.isConfigured()) {
    logger.warn('eCourts sync: API not configured');
    return {
      success: false,
      totalFetched: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      errorDetails: { error: 'API not configured' },
    };
  }

  const syncLog = await prisma.syncLog.create({
    data: {
      startedAt: new Date(),
      status: 'running',
      triggeredBy: config.triggeredBy,
    },
  });

  logger.info('eCourts sync: Starting sync', { syncLogId: syncLog.id, states: config.states });

  let totalFetched = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const errorDetails: Record<string, unknown> = {};

  try {
    for (const stateCode of config.states) {
      const districts = STATE_DISTRICT_CODES[stateCode];
      if (!districts) {
        logger.warn('eCourts sync: Unknown state code', { stateCode });
        errorDetails[stateCode] = 'Unknown state code';
        continue;
      }

      for (const districtCode of districts) {
        logger.info('eCourts sync: Processing district', { stateCode, districtCode });

        const result = await processDistrict(stateCode, districtCode, syncLog.id);
        totalFetched += result.fetched;
        totalUpdated += result.updated;
        totalErrors += result.errors;
        totalSkipped += result.fetched - (result.updated + result.errors);
      }
    }

    await prisma.syncLog.update({
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

    logger.info('eCourts sync: Completed', {
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
    logger.error('eCourts sync: Failed', error);

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'failed',
        totalFetched,
        totalUpdated,
        totalSkipped,
        totalErrors: totalErrors + 1,
        errorDetails: { error: errorMessage },
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