export interface User {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  password: string;
  isActive: boolean;
  isSubscribed: boolean;
  subscriptionExpiry: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  courtName: string | null;
  hearingDate: Date | null;
  postedFor: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Calculation {
  id: string;
  userId: string;
  type: string;
  inputData: Record<string, unknown>;
  resultData: Record<string, unknown>;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  amount: number;
  paymentId: string | null;
  orderId: string | null;
  status: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AppVersion {
  id: string;
  version: string;
  minVersion: string | null;
  forceUpdate: boolean;
  playstoreUrl: string | null;
  paymentKey: string | null;
  paymentPrice: number;
  paymentImg: string | null;
  paymentAllowDays: number;
  deathCount: number;
  injuriesCount: number;
  updatedAt: Date;
}

export interface Banner {
  id: string;
  title: string | null;
  image: string | null;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface News {
  id: string;
  news: string;
  isActive: boolean;
  createdAt: Date;
}

export interface APIResponse<T = unknown> {
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

export type ClaimType = 'fatal' | 'non-fatal';
export type ClaimantType = 'married' | 'bachelor' | 'minor';
export type DisabilitySide = 'single' | 'both';
export type CalculatorType = 'locomotor' | 'amputation' | 'ptd' | 'ppd';

export interface LoginFormData {
  identifier: string;
  password: string;
}

export interface SignupFormData {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface OtpVerificationData {
  phone?: string;
  email?: string;
  otp: string;
}

export interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}
