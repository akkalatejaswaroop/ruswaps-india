import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 30;

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

async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);
    const expiresAt = new Date(now.getTime() + RATE_LIMIT_WINDOW);

    const existing = await prisma.rateLimit.findUnique({
      where: { key: identifier },
    });

    if (!existing || existing.windowStart < windowStart) {
      await prisma.rateLimit.upsert({
        where: { key: identifier },
        update: { count: 1, windowStart: now, expiresAt },
        create: { key: identifier, count: 1, windowStart: now, expiresAt },
      });
      return true;
    }

    if (existing.count >= MAX_ATTEMPTS) {
      return false;
    }

    await prisma.rateLimit.update({
      where: { key: identifier },
      data: { count: existing.count + 1 },
    });
    return true;
  } catch (error) {
    return false;
  }
}

function getAuthUser(request: NextRequest): { userId: string } | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return { userId };
}

const ALLOWED_STATUSES = ['pending', 'next_hearing', 'disposed'] as const;
const ALLOWED_CASE_TYPES = [
  'Motor Vehicle Accident - Death Claim',
  'Motor Vehicle Accident - Injury Claim',
  'Employee Compensation - Death',
  'Employee Compensation - Injury'
] as const;

function sanitizeString(value: unknown, maxLength: number = 255): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function sanitizeNumber(value: unknown, min: number, max: number): number | null {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
}

function sanitizeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return null;
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`cases:get:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cases = await prisma.case.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: cases });

  } catch (error) {
    console.error('Get cases error:', { code: 'GET_CASES_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`cases:post:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { caseNo, caseYear, caseType, courtName, hearingDate, postedFor, status } = body;

    if (!caseNo || !caseYear || !caseType) {
      return NextResponse.json({ success: false, message: 'Case number, year, and type are required' }, { status: 400 });
    }

    const sanitizedCaseNo = sanitizeString(caseNo, 50);
    const sanitizedYear = sanitizeNumber(caseYear, 1900, 2100);
    const sanitizedType = ALLOWED_CASE_TYPES.includes(caseType) ? caseType : sanitizeString(caseType, 100);

    if (!sanitizedCaseNo || !sanitizedYear || !sanitizedType) {
      return NextResponse.json({ success: false, message: 'Invalid case data' }, { status: 400 });
    }

    const newCase = await prisma.case.create({
      data: {
        userId: user.userId,
        caseNo: sanitizedCaseNo,
        caseYear: sanitizedYear,
        caseType: sanitizedType,
        courtName: sanitizeString(courtName, 255),
        hearingDate: sanitizeDate(hearingDate),
        postedFor: sanitizeString(postedFor, 255),
        status: ALLOWED_STATUSES.includes(status) ? status : 'pending',
      },
    });

    return NextResponse.json({ success: true, data: newCase, message: 'Case created successfully' });

  } catch (error) {
    console.error('Create case error:', { code: 'CREATE_CASE_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`cases:put:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { caseId } = body;

    if (!caseId || typeof caseId !== 'string') {
      return NextResponse.json({ success: false, message: 'Case ID is required' }, { status: 400 });
    }

    const existingCase = await prisma.case.findFirst({
      where: { id: caseId, userId: user.userId },
    });

    if (!existingCase) {
      return NextResponse.json({ success: false, message: 'Case not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.caseNo !== undefined) {
      updateData.caseNo = sanitizeString(body.caseNo, 50);
    }
    if (body.caseYear !== undefined) {
      const year = sanitizeNumber(body.caseYear, 1900, 2100);
      if (year) updateData.caseYear = year;
    }
    if (body.caseType !== undefined) {
      const caseType = sanitizeString(body.caseType, 100);
      if (caseType) updateData.caseType = caseType;
    }
    if (body.courtName !== undefined) {
      updateData.courtName = sanitizeString(body.courtName, 255);
    }
    if (body.hearingDate !== undefined) {
      updateData.hearingDate = sanitizeDate(body.hearingDate);
    }
    if (body.postedFor !== undefined) {
      updateData.postedFor = sanitizeString(body.postedFor, 255);
    }
    if (body.status !== undefined && ALLOWED_STATUSES.includes(body.status)) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No valid fields to update' }, { status: 400 });
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedCase, message: 'Case updated successfully' });

  } catch (error) {
    console.error('Update case error:', { code: 'UPDATE_CASE_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`cases:delete:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({ success: false, message: 'Case ID is required' }, { status: 400 });
    }

    const existingCase = await prisma.case.findFirst({
      where: { id: caseId, userId: user.userId },
    });

    if (!existingCase) {
      return NextResponse.json({ success: false, message: 'Case not found' }, { status: 404 });
    }

    await prisma.case.delete({ where: { id: caseId } });

    return NextResponse.json({ success: true, message: 'Case deleted successfully' });

  } catch (error) {
    console.error('Delete case error:', { code: 'DELETE_CASE_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
