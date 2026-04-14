export interface RawECourtsCase {
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

export interface RawECourtsHearing {
  hearing_date: string;
  purpose: string | null;
  next_date: string | null;
  order_remarks: string | null;
}

export interface NormalizedCase {
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
  districtCode: string;
  districtName: string;
  courtCode: string | null;
  courtName: string | null;
  establishmentCode: string | null;
  rawData: RawECourtsCase;
  syncedAt: Date;
  changedAt: Date;
}

export interface FetchCasesResponse {
  cases: RawECourtsCase[];
  totalPages: number;
}

export interface FetchCaseResponse {
  case?: RawECourtsCase;
}

export interface FetchHearingHistoryResponse {
  hearings: RawECourtsHearing[];
}
