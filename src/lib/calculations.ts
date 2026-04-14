import { z } from 'zod';

export const ageFactors = [
  { minAge: 0, maxAge: 16, factor: 0.50 },
  { minAge: 17, maxAge: 22, factor: 0.65 },
  { minAge: 23, maxAge: 25, factor: 0.70 },
  { minAge: 26, maxAge: 30, factor: 0.80 },
  { minAge: 31, maxAge: 35, factor: 0.90 },
  { minAge: 36, maxAge: 40, factor: 0.95 },
  { minAge: 41, maxAge: 45, factor: 1.00 },
  { minAge: 46, maxAge: 50, factor: 1.10 },
  { minAge: 51, maxAge: 55, factor: 1.25 },
  { minAge: 56, maxAge: 60, factor: 1.40 },
  { minAge: 61, maxAge: 150, factor: 1.50 },
] as const;

export function getAgeFactor(age: number): number {
  const factor = ageFactors.find(f => age >= f.minAge && age <= f.maxAge);
  return factor?.factor ?? 1.0;
}

export const mvaClaimTypeSchema = z.enum(['fatal', 'non-fatal']);
export const claimantTypeSchema = z.enum(['married', 'bachelor', 'minor']);
export const disabilitySideSchema = z.enum(['single', 'both']);

export const mvaInputSchema = z.object({
  claimType: mvaClaimTypeSchema,
  age: z.number().int().min(0).max(120),
  monthlyIncome: z.number().positive().max(100000000),
  dependents: z.number().int().min(0).max(50).optional(),
  disabilityPercentage: z.number().min(0).max(100).optional(),
  otherExpenses: z.number().min(0).max(100000000).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  days: z.number().int().min(1).max(3650).optional(),
  claimantType: claimantTypeSchema.optional(),
});

export const ecInputSchema = z.object({
  claimType: mvaClaimTypeSchema,
  age: z.number().int().min(0).max(120),
  monthlyWages: z.number().positive().max(100000000),
  disabilityPercentage: z.number().min(0).max(100).optional(),
  otherExpenses: z.number().min(0).max(100000000).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  days: z.number().int().min(1).max(3650).optional(),
});

export const disabilityInputSchema = z.object({
  type: z.enum(['locomotor', 'amputation', 'ptd', 'ppd']),
  percentage: z.number().min(0).max(100).optional(),
  side: disabilitySideSchema.optional(),
  extremityType: z.enum(['upper', 'lower', 'spine']).optional(),
  subType: z.string().optional(),
  impairment: z.number().min(0).max(100).optional(),
  level: z.string().optional(),
});

export const incomeTaxInputSchema = z.object({
  awardAmount: z.number().min(0).max(1000000000),
  interestRate: z.number().min(0).max(100),
  days: z.number().int().min(1).max(3650),
  hasPAN: z.boolean(),
});

export const hitRunInputSchema = z.object({
  deathCount: z.number().int().min(1).max(1000),
  driverIdentified: z.boolean(),
});

export const calculationRequestSchema = z.object({
  type: z.enum(['mva', 'ec', 'disability', 'income-tax', 'hit-run']),
  data: z.union([
    mvaInputSchema,
    ecInputSchema,
    disabilityInputSchema,
    incomeTaxInputSchema,
    hitRunInputSchema,
  ]).refine((data) => {
    const type = calculationRequestSchema.parse({ type: '', data }).type;
    return true;
  }, { message: 'Invalid data for calculation type' }),
}).strict();

export interface MVAInput {
  claimType: 'fatal' | 'non-fatal';
  age: number;
  monthlyIncome: number;
  dependents?: number;
  disabilityPercentage?: number;
  otherExpenses?: number;
  interestRate?: number;
  days?: number;
  claimantType?: 'married' | 'bachelor' | 'minor';
}

export interface MVAOutput {
  type: 'Fatal' | 'Non-Fatal';
  ageFactor: number;
  lossOfDependency: number;
  lossOfEarningCapacity?: number;
  funeralExpenses: number;
  otherExpenses: number;
  totalCompensation: number;
  interestRate: number;
  interestAmount: number;
  totalWithInterest: number;
}

export function calculateMVA(input: MVAInput): MVAOutput {
  const {
    claimType,
    age,
    monthlyIncome,
    dependents = 1,
    disabilityPercentage = 0,
    otherExpenses = 0,
    interestRate = 7,
    days = 365,
    claimantType = 'married',
  } = input;

  const ageFactor = getAgeFactor(age);
  let lossOfDependency = 0;
  let lossOfEarningCapacity: number | undefined;
  let funeralExpenses = 0;

  if (claimType === 'fatal') {
    let multiplier = 1;
    if (claimantType === 'bachelor') multiplier = 0.80;
    else if (claimantType === 'minor') multiplier = 0.75;

    const dependentMultiplier = Math.min(2, 1 + (Math.max(0, dependents - 1) * 0.10));
    lossOfDependency = Math.round((monthlyIncome * 50 / 100) * 12 * ageFactor * multiplier * dependentMultiplier);
    funeralExpenses = 20000;
  } else {
    const disabilityDecimal = disabilityPercentage / 100;
    lossOfEarningCapacity = Math.round((monthlyIncome * 60 / 100) * disabilityDecimal * 12 * ageFactor);
  }

  const totalCompensation = claimType === 'fatal'
    ? lossOfDependency + otherExpenses + funeralExpenses
    : (lossOfEarningCapacity || 0) + otherExpenses;

  const interestAmount = Math.round(((totalCompensation * interestRate) / 100) * (days / 365));
  const totalWithInterest = totalCompensation + interestAmount;

  return {
    type: claimType === 'fatal' ? 'Fatal' : 'Non-Fatal',
    ageFactor,
    lossOfDependency,
    lossOfEarningCapacity,
    funeralExpenses,
    otherExpenses,
    totalCompensation,
    interestRate,
    interestAmount,
    totalWithInterest,
  };
}

export interface ECInput {
  claimType: 'fatal' | 'non-fatal';
  age: number;
  monthlyWages: number;
  disabilityPercentage?: number;
  otherExpenses?: number;
  interestRate?: number;
  days?: number;
}

export interface ECOutput {
  type: 'Fatal' | 'Non-Fatal';
  ageFactor: number;
  lossOfFutureIncome: number;
  lossOfEarning?: number;
  otherExpenses: number;
  totalCompensation: number;
  interestRate: number;
  interestAmount: number;
  totalWithInterest: number;
}

export function calculateEC(input: ECInput): ECOutput {
  const {
    claimType,
    age,
    monthlyWages,
    disabilityPercentage = 0,
    otherExpenses = 0,
    interestRate = 6,
    days = 365,
  } = input;

  const ageFactor = getAgeFactor(age);
  let lossOfFutureIncome = 0;
  let lossOfEarning: number | undefined;

  if (claimType === 'fatal') {
    lossOfFutureIncome = Math.round(((monthlyWages * 50 / 100) * 12 * ageFactor));
  } else {
    const disabilityDecimal = (disabilityPercentage || 0) / 100;
    lossOfEarning = Math.round((monthlyWages * 60 / 100) * disabilityDecimal * ageFactor * 12);
  }

  const totalCompensation = claimType === 'fatal'
    ? lossOfFutureIncome + otherExpenses
    : (lossOfEarning || 0) + otherExpenses;

  const interestAmount = Math.round(((totalCompensation * interestRate) / 100) * (days / 365));
  const totalWithInterest = totalCompensation + interestAmount;

  return {
    type: claimType === 'fatal' ? 'Fatal' : 'Non-Fatal',
    ageFactor,
    lossOfFutureIncome,
    lossOfEarning,
    otherExpenses,
    totalCompensation,
    interestRate,
    interestAmount,
    totalWithInterest,
  };
}

export interface DisabilityInput {
  type: 'locomotor' | 'amputation' | 'ptd' | 'ppd';
  percentage?: number;
  side?: 'single' | 'both';
  extremityType?: 'upper' | 'lower' | 'spine';
  subType?: string;
  impairment?: number;
  level?: string;
}

export interface DisabilityOutput {
  type: string;
  side: 'single' | 'both';
  regionalDisability: number;
  wholeBodyDisability: number;
  description?: string;
}

function getWholeBodyConversionFactor(type: string, extremityType?: string): number {
  if (type === 'amputation') {
    switch (extremityType) {
      case 'upper':
        return 0.60;
      case 'lower':
        return 0.40;
      case 'spine':
        return 0.50;
      default:
        return 0.50;
    }
  } else if (type === 'ptd' || type === 'ppd') {
    return 0.70;
  } else {
    return 0.70;
  }
}

export function calculateDisability(input: DisabilityInput): DisabilityOutput {
  const {
    type,
    percentage = 0,
    side = 'single',
    extremityType,
  } = input;

  let regionalDisability = percentage;

  if (side === 'both' && (type === 'amputation' || type === 'ptd')) {
    regionalDisability = Math.min(100, regionalDisability * 1.5);
  } else if (side === 'both') {
    regionalDisability = Math.min(100, regionalDisability * 2);
  }

  const conversionFactor = getWholeBodyConversionFactor(type, extremityType);
  const wholeBodyDisability = Math.round(regionalDisability * conversionFactor);

  return {
    type,
    side,
    regionalDisability: Math.round(regionalDisability),
    wholeBodyDisability: Math.min(100, wholeBodyDisability),
  };
}

export interface IncomeTaxInput {
  awardAmount: number;
  interestRate: number;
  days: number;
  hasPAN: boolean;
}

export interface IncomeTaxOutput {
  awardAmount: number;
  interestRate: number;
  days: number;
  grossInterest: number;
  tdsRate: number;
  tdsAmount: number;
  netPayable: number;
  hasPAN: boolean;
  tdsApplicable: boolean;
}

export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxOutput {
  const { awardAmount, interestRate, days, hasPAN } = input;

  const interestAmount = (awardAmount * interestRate * days) / (100 * 365);
  const grossInterest = Math.round(interestAmount);

  let tdsRate = 0;
  let tdsAmount = 0;
  const tdsThreshold = 10000;

  if (interestAmount > tdsThreshold) {
    if (hasPAN) {
      tdsRate = 10;
      tdsAmount = grossInterest * 0.1;
    } else {
      tdsRate = 20;
      tdsAmount = grossInterest * 0.2;
    }
  }

  const tdsApplicable = grossInterest > tdsThreshold;
  const netPayable = Math.round(grossInterest - tdsAmount);

  return {
    awardAmount,
    interestRate,
    days,
    grossInterest,
    tdsRate,
    tdsAmount: Math.round(tdsAmount),
    netPayable,
    hasPAN,
    tdsApplicable,
  };
}

export interface HitRunInput {
  deathCount: number;
  driverIdentified: boolean;
}

export interface HitRunOutput {
  deathCount: number;
  driverStatus: 'Identified' | 'Untraced';
  perCaseAmount: number;
  totalCompensation: number;
}

export function calculateHitRun(input: HitRunInput): HitRunOutput {
  const { deathCount, driverIdentified } = input;

  const perCaseAmount = driverIdentified ? 500000 : 250000;
  const totalCompensation = perCaseAmount * deathCount;

  return {
    deathCount,
    driverStatus: driverIdentified ? 'Identified' : 'Untraced',
    perCaseAmount,
    totalCompensation,
  };
}

export function validateAndParseCalculation(type: string, data: unknown): {
  success: boolean;
  data?: unknown;
  error?: string;
} {
  try {
    switch (type) {
      case 'mva': {
        const parsed = mvaInputSchema.safeParse(data);
        if (!parsed.success) {
          return { success: false, error: parsed.error.issues.map(i => i.message).join(', ') };
        }
        return { success: true, data: parsed.data };
      }
      case 'ec': {
        const parsed = ecInputSchema.safeParse(data);
        if (!parsed.success) {
          return { success: false, error: parsed.error.issues.map(i => i.message).join(', ') };
        }
        return { success: true, data: parsed.data };
      }
      case 'disability': {
        const parsed = disabilityInputSchema.safeParse(data);
        if (!parsed.success) {
          return { success: false, error: parsed.error.issues.map(i => i.message).join(', ') };
        }
        return { success: true, data: parsed.data };
      }
      case 'income-tax': {
        const parsed = incomeTaxInputSchema.safeParse(data);
        if (!parsed.success) {
          return { success: false, error: parsed.error.issues.map(i => i.message).join(', ') };
        }
        return { success: true, data: parsed.data };
      }
      case 'hit-run': {
        const parsed = hitRunInputSchema.safeParse(data);
        if (!parsed.success) {
          return { success: false, error: parsed.error.issues.map(i => i.message).join(', ') };
        }
        return { success: true, data: parsed.data };
      }
      default:
        return { success: false, error: 'Invalid calculation type' };
    }
  } catch (error) {
    return { success: false, error: 'Validation failed' };
  }
}
