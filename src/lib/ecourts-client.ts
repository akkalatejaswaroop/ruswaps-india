import { getOptionalEnv } from './env';
import { logger } from './logger';

const API_BASE_URL = getOptionalEnv('ECOURTS_API_BASE_URL', 'https://apis.ecourts.gov.in/public');
const API_KEY = getOptionalEnv('ECOURTS_API_KEY');

export interface ECourtCase {
  cnr_number: string;
  case_number: string;
  case_type: string;
  filing_date?: string;
  registration_date?: string;
  status?: string;
  next_hearing_date?: string;
  last_hearing_date?: string;
  petitioner?: string;
  respondent?: string;
  advocate?: string;
  judge?: string;
  act_section?: string;
  court_name?: string;
  state_code?: string;
  district_code?: string;
  taluka?: string;
  establishment_code?: string;
  court_code?: string;
}

export interface ECourtCaseResponse {
  status: string;
  data: ECourtCase[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ECourtCaseDetailResponse {
  status: string;
  data: ECourtCase;
}

export interface ECourtOrder {
  hearing_date: string;
  purpose?: string;
  next_date?: string;
  order?: string;
}

export interface ECourtOrderResponse {
  status: string;
  data: ECourtOrder[];
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ECourtsClient {
  private baseUrl: string;
  private apiKey: string;
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_MS = 500;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || API_BASE_URL || '';
    this.apiKey = apiKey || API_KEY || '';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }
    return headers;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      await sleep(this.RATE_LIMIT_MS - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }

  async fetchCasesByDistrict(
    stateCode: string,
    districtCode: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<ApiResult<ECourtCaseResponse>> {
    await this.enforceRateLimit();

    const url = `${this.baseUrl}/v1/cases?state_code=${stateCode}&dist_code=${districtCode}&page=${page}&limit=${pageSize}`;

    logger.info('eCourts API: Fetching cases by district', { stateCode, districtCode, page, pageSize, url });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = `HTTP ${response.status}: ${response.statusText}`;
        logger.error('eCourts API: HTTP error fetching cases', { status: response.status, statusText: response.statusText });
        return { data: null, error: errorText };
      }

      const data = await response.json() as ECourtCaseResponse;
      logger.info('eCourts API: Cases fetched successfully', { count: data.data?.length || 0, stateCode, districtCode });
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('eCourts API: Exception fetching cases', error);
      return { data: null, error: errorMessage };
    }
  }

  async fetchCaseByCNR(cnrNumber: string): Promise<ApiResult<ECourtCaseDetailResponse>> {
    await this.enforceRateLimit();

    const url = `${this.baseUrl}/v1/case/cnr/${cnrNumber}`;

    logger.info('eCourts API: Fetching case by CNR', { cnrNumber, url });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = `HTTP ${response.status}: ${response.statusText}`;
        logger.error('eCourts API: HTTP error fetching case', { status: response.status, cnrNumber });
        return { data: null, error: errorText };
      }

      const data = await response.json() as ECourtCaseDetailResponse;
      logger.info('eCourts API: Case fetched successfully', { cnrNumber });
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('eCourts API: Exception fetching case', error);
      return { data: null, error: errorMessage };
    }
  }

  async fetchHearingHistory(cnrNumber: string): Promise<ApiResult<ECourtOrderResponse>> {
    await this.enforceRateLimit();

    const url = `${this.baseUrl}/v1/case/cnr/${cnrNumber}/orders`;

    logger.info('eCourts API: Fetching hearing history', { cnrNumber, url });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = `HTTP ${response.status}: ${response.statusText}`;
        logger.error('eCourts API: HTTP error fetching orders', { status: response.status, cnrNumber });
        return { data: null, error: errorText };
      }

      const data = await response.json() as ECourtOrderResponse;
      logger.info('eCourts API: Orders fetched successfully', { count: data.data?.length || 0, cnrNumber });
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('eCourts API: Exception fetching orders', error);
      return { data: null, error: errorMessage };
    }
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }
}

export const ecourtsClient = new ECourtsClient();