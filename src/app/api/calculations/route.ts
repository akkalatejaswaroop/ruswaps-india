import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAgeFactor } from '@/lib/database';

function getAuthUser(request: NextRequest): { userId: string } | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return { userId };
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ success: false, message: 'Type and data are required' }, { status: 400 });
    }

    let result: any;

    switch (type) {
      case 'mva':
        result = calculateMVA(data);
        break;
      case 'ec':
        result = calculateEC(data);
        break;
      case 'disability':
        result = calculateDisability(data);
        break;
      case 'income-tax':
        result = calculateIncomeTax(data);
        break;
      case 'hit-run':
        result = calculateHitRun(data);
        break;
      default:
        return NextResponse.json({ success: false, message: 'Invalid calculation type' }, { status: 400 });
    }

    const calculation = await prisma.calculation.create({
      data: {
        userId: user.userId,
        type,
        inputData: data,
        resultData: result,
      },
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json({ success: false, message: 'Calculation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');

    const where: any = { userId: user.userId };
    if (type) where.type = type;

    const calculations = await prisma.calculation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: calculations });

  } catch (error) {
    console.error('Get calculations error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

function calculateMVA(data: any) {
  const { claimType, age, monthlyIncome, dependents, disabilityPercentage, otherExpenses, interestRate, days } = data;
  const ageFactor = getAgeFactor(age);

  let lossOfDependency = 0;
  let funeralExpenses = 0;

  if (claimType === 'fatal') {
    lossOfDependency = Math.round((monthlyIncome * 50 / 100) * 12 * ageFactor);
    funeralExpenses = 20000;
  } else {
    const disabilityDecimal = (disabilityPercentage || 0) / 100;
    lossOfDependency = Math.round((monthlyIncome * 60 / 100) * disabilityDecimal * 12 * ageFactor);
  }

  const totalCompensation = lossOfDependency + (otherExpenses || 0) + funeralExpenses;
  const interestAmount = Math.round(((totalCompensation * interestRate) / 100) * (days / 365));
  const totalWithInterest = totalCompensation + interestAmount;

  return {
    type: claimType === 'fatal' ? 'Fatal' : 'Non-Fatal',
    ageFactor,
    lossOfDependency,
    funeralExpenses,
    otherExpenses: otherExpenses || 0,
    totalCompensation,
    interestRate,
    interestAmount,
    totalWithInterest,
  };
}

function calculateEC(data: any) {
  const { claimType, age, monthlyWages, disabilityPercentage, otherExpenses, interestRate, days } = data;
  const ageFactor = getAgeFactor(age);

  let lossOfFutureIncome = 0;

  if (claimType === 'fatal') {
    lossOfFutureIncome = Math.round((monthlyWages * 50 / 100) * 12 * ageFactor);
  } else {
    const disabilityDecimal = (disabilityPercentage || 0) / 100;
    lossOfFutureIncome = Math.round((monthlyWages * 60 / 100) * disabilityDecimal * ageFactor * 12);
  }

  const totalCompensation = lossOfFutureIncome + (otherExpenses || 0);
  const interestAmount = Math.round(((totalCompensation * interestRate) / 100) * (days / 365));
  const totalWithInterest = totalCompensation + interestAmount;

  return {
    type: claimType === 'fatal' ? 'Fatal' : 'Non-Fatal',
    ageFactor,
    lossOfFutureIncome,
    otherExpenses: otherExpenses || 0,
    totalCompensation,
    interestRate,
    interestAmount,
    totalWithInterest,
  };
}

function calculateDisability(data: any) {
  const { type, percentage, side } = data;

  let regionalDisability = percentage || 0;
  
  if (side === 'both') {
    regionalDisability = Math.min(100, regionalDisability * 1.5);
  }

  const wholeBodyDisability = Math.round(regionalDisability * 0.7);

  return {
    type,
    side: side || 'single',
    regionalDisability: Math.round(regionalDisability),
    wholeBodyDisability,
  };
}

function calculateIncomeTax(data: any) {
  const { awardAmount, interestRate, days, hasPAN } = data;

  const interestAmount = (awardAmount * interestRate * days) / (100 * 365);

  let tdsRate = 0;
  if (hasPAN) {
    tdsRate = interestAmount > 10000 ? 10 : 0;
  } else {
    tdsRate = 20;
  }

  const tdsAmount = interestAmount * (tdsRate / 100);
  const netPayable = interestAmount - tdsAmount;

  return {
    awardAmount,
    interestRate,
    days,
    grossInterest: Math.round(interestAmount),
    tdsRate,
    tdsAmount: Math.round(tdsAmount),
    netPayable: Math.round(netPayable),
    hasPAN,
  };
}

function calculateHitRun(data: any) {
  const { deathCount, driverIdentified } = data;

  const perCaseAmount = driverIdentified ? 500000 : 250000;
  const totalCompensation = perCaseAmount * (deathCount || 1);

  return {
    deathCount: deathCount || 1,
    driverStatus: driverIdentified ? 'Identified' : 'Untraced',
    perCaseAmount,
    totalCompensation,
  };
}
