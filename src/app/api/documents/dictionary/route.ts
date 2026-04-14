import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

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

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) return false;
  
  const payload = await verifyToken(token);
  if (!payload) return false;
  if (!('role' in payload) || (payload as { role: string }).role !== 'ADMIN') {
    return false;
  }
  
  return true;
}

function sanitizeString(value: unknown, maxLength: number = 5000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9]{1,50}$/.test(id);
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`dictionary:get:${clientIp}`, 'api');
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { term: { contains: search, mode: 'insensitive' } },
        { definition: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (category) {
      where.category = category;
    }

    const terms = await prisma.legalDictionary.findMany({
      where,
      orderBy: { term: 'asc' },
    });

    return NextResponse.json({ success: true, data: terms });

  } catch (error) {
    console.error('Get dictionary error:', { code: 'GET_DICTIONARY_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`dictionary:post:${clientIp}`, 'api');
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders });
    }

    const body = await request.json();
    const { term, definition, category } = body;

    if (!term || !definition) {
      return NextResponse.json({ success: false, message: 'Term and definition are required' }, { status: 400 });
    }

    const newTerm = await prisma.legalDictionary.create({
      data: {
        term: sanitizeString(term, 255),
        definition: sanitizeString(definition),
        category: sanitizeString(category, 100) || null,
      },
    });

    return NextResponse.json({ success: true, data: newTerm, message: 'Term added successfully' });

  } catch (error) {
    console.error('Create dictionary term error:', { code: 'CREATE_DICTIONARY_TERM_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`dictionary:put:${clientIp}`, 'api');
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders });
    }

    const body = await request.json();
    const { id, term, definition, category } = body;

    if (!id || !isValidId(id)) {
      return NextResponse.json({ success: false, message: 'Valid ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (term) updateData.term = sanitizeString(term, 255);
    if (definition) updateData.definition = sanitizeString(definition);
    if (category !== undefined) updateData.category = sanitizeString(category, 100) || null;

    const updatedTerm = await prisma.legalDictionary.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedTerm, message: 'Term updated successfully' });

  } catch (error) {
    console.error('Update dictionary term error:', { code: 'UPDATE_DICTIONARY_TERM_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`dictionary:delete:${clientIp}`, 'api');
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !isValidId(id)) {
      return NextResponse.json({ success: false, message: 'Valid ID is required' }, { status: 400 });
    }

    await prisma.legalDictionary.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Term deleted successfully' });

  } catch (error) {
    console.error('Delete dictionary term error:', { code: 'DELETE_DICTIONARY_TERM_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
