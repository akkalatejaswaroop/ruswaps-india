// Type definitions for Ruswaps Web Application

export interface User {
  id: string;
  phone: string;
  email: string;
  name: string;
  password: string;
  isActive: boolean;
  isSubscribed: boolean;
  subscriptionExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: Omit<User, 'password'>;
  message?: string;
}

export interface Case {
  id: string;
  userId: string;
  caseNo: string;
  caseYear: number;
  caseType: string;
  courtName: string;
  hearingDate?: string;
  postedFor?: string;
  status: 'pending' | 'next_hearing' | 'disposed';
  createdAt: string;
  updatedAt: string;
}

export interface MVADetails {
  claimType: 'fatal' | 'non-fatal';
  claimantType?: 'married' | 'bachelor' | 'minor';
  caseNo: string;
  caseYear: number;
  courtName: string;
  age: number;
  monthlyIncome: number;
  dependents?: number;
  disabilityPercentage?: number;
  otherExpenses: number;
  interestRate: number;
  days: number;
}

export interface ECDetails {
  claimType: 'fatal' | 'non-fatal';
  caseNo: string;
  caseYear: number;
  courtName: string;
  age: number;
  monthlyWages: number;
  disabilityPercentage?: number;
  otherExpenses: number;
  interestRate: number;
  days: number;
}

export interface DisabilityDetails {
  type: 'locomotor' | 'amputation' | 'ptd' | 'ppd';
  extremityType?: 'upper' | 'lower' | 'spine';
  subType?: string;
  impairment?: number;
  level?: string;
  side?: 'right' | 'left' | 'both';
  percentage?: number;
}

export interface CalculationResult {
  type: string;
  totalCompensation: number;
  interestAmount: number;
  totalWithInterest: number;
  breakdown: Record<string, number>;
  pdfUrl?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'monthly' | 'annual';
  amount: number;
  paymentId?: string;
  orderId?: string;
  status: 'pending' | 'completed' | 'failed';
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface AppVersion {
  version: string;
  minVersion: string;
  forceUpdate: boolean;
  playstoreUrl: string;
  paymentPrice: number;
  paymentAllowDays: number;
  deathCount: number;
  injuriesCount: number;
}

export interface AgeFactor {
  minAge: number;
  maxAge: number;
  factor: number;
}

export interface LegalDocument {
  id: string;
  title: string;
  type: 'vakalatnama' | 'dictionary' | 'provision' | 'act';
  content: string;
  category: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string;
  isActive: boolean;
  order: number;
}

export interface News {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
