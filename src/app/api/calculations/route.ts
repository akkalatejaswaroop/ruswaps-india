import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  calculateMVA, calculateEC, calculateDisability, calculateIncomeTax, calculateHitRun,
  validateAndParseCalculation,
  MVAInput, ECInput, DisabilityInput, IncomeTaxInput, HitRunInput,
} from '@/lib/calculations';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/lib/auth-helpers';
import { randomBytes } from 'crypto';

function generateVerificationId(): string {
  return randomBytes(6).toString('hex').toUpperCase();
}

const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map(p => p.trim());

function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXIES.includes(ip);
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    for (const ip of ips) {
      if (!isTrustedProxy(ip)) {
        return ip;
      }
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && !isTrustedProxy(realIp)) {
    return realIp;
  }

  return '127.0.0.1';
}

const ALLOWED_CALCULATION_TYPES = ['mva', 'ec', 'disability', 'income-tax', 'hit-run'] as const;
type CalculationType = typeof ALLOWED_CALCULATION_TYPES[number];

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`calc:post:${clientIp}`, 'calculation');

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ success: false, message: 'Type and data are required' }, { status: 400, headers: rateLimitHeaders });
    }

    if (!ALLOWED_CALCULATION_TYPES.includes(type as CalculationType)) {
      return NextResponse.json({ success: false, message: 'Invalid calculation type' }, { status: 400, headers: rateLimitHeaders });
    }

    const validation = validateAndParseCalculation(type, data);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error || 'Invalid input data' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    let result;
    const startTime = Date.now();

    try {
      switch (type) {
        case 'mva':
          result = calculateMVA(validation.data as MVAInput);
          break;
        case 'ec':
          result = calculateEC(validation.data as ECInput);
          break;
        case 'disability':
          result = calculateDisability(validation.data as DisabilityInput);
          break;
        case 'income-tax':
          result = calculateIncomeTax(validation.data as IncomeTaxInput);
          break;
        case 'hit-run':
          result = calculateHitRun(validation.data as HitRunInput);
          break;
        default:
          return NextResponse.json({ success: false, message: 'Invalid calculation type' }, { status: 400, headers: rateLimitHeaders });
      }
    } catch (calcError) {
      logger.error('Calculation execution failed', calcError, { userId: user.userId, calculationType: type });
      return NextResponse.json({ success: false, message: 'Calculation failed' }, { status: 500, headers: rateLimitHeaders });
    }

    const calculationDuration = Date.now() - startTime;
    logger.performance(`calculation:${type}`, calculationDuration, { userId: user.userId });

    const userDetails = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { isSubscribed: true }
    });

    const isSubscribed = userDetails?.isSubscribed ?? false;
    const verificationId = isSubscribed ? `RUN-${type.toUpperCase()}-${generateVerificationId()}` : null;

    try {
      const savedCalc = await prisma.calculation.create({
        data: {
          userId: user.userId,
          type,
          inputData: validation.data as object,
          resultData: result as object,
          verificationId,
          isVerified: isSubscribed,
        },
      });
      
      if (isSubscribed) {
        // @ts-ignore
        result.verificationId = verificationId;
        // @ts-ignore
        result.isVerified = true;
        // @ts-ignore
        result.calcId = savedCalc.id;
      }
    } catch (dbError) {
      logger.error('Failed to save calculation to database', dbError, { userId: user.userId, calculationType: type });
    }

    return NextResponse.json({ success: true, data: result }, { headers: rateLimitHeaders });

  } catch (error) {
    logger.error('Calculation route error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`calc:get:${clientIp}`, 'api');

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    let limit = parseInt(searchParams.get('limit') || '50');
    limit = Math.min(Math.max(limit, 1), 100);

    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Prisma.CalculationWhereInput = { userId: user.userId };

    if (type && ALLOWED_CALCULATION_TYPES.includes(type as CalculationType)) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const calculations = await prisma.calculation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const total = await prisma.calculation.count({ where });

    return NextResponse.json({
      success: true,
      data: calculations,
      pagination: {
        total,
        limit,
        hasMore: calculations.length === limit,
      }
    }, { headers: rateLimitHeaders });

  } catch (error) {
    logger.error('Get calculations route error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`calc:delete:${clientIp}`, 'calculation');

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Calculation ID is required' }, { status: 400, headers: rateLimitHeaders });
    }

    const calculation = await prisma.calculation.findFirst({
      where: { id, userId: user.userId },
    });

    if (!calculation) {
      return NextResponse.json({ success: false, message: 'Calculation not found' }, { status: 404, headers: rateLimitHeaders });
    }

    await prisma.calculation.delete({ where: { id } });

    logger.info('Calculation deleted', { userId: user.userId, calculationId: id });

    return NextResponse.json({ success: true, message: 'Calculation deleted' }, { headers: rateLimitHeaders });

  } catch (error) {
    logger.error('Delete calculation route error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
