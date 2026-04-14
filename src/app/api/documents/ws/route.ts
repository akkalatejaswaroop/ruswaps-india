import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, verifyAdminAccess } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 30;

const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map(p => p.trim());

const ALLOWED_URL_PROTOCOLS = ['https'];
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.internal',
];

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

function sanitizeString(value: unknown, maxLength: number = 5000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    if (!ALLOWED_URL_PROTOCOLS.includes(url.protocol)) {
      return false;
    }
    
    const hostname = url.hostname.toLowerCase();
    
    if (BLOCKED_HOSTS.some(blocked => hostname === blocked || hostname.endsWith(`.${blocked}`))) {
      return false;
    }
    
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)) return false;
    if (/^192\.168\.\d+\.\d+$/.test(hostname)) return false;
    
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`wsdocs:get:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (category) {
      where.category = sanitizeString(category, 100);
    }

    const docs = await prisma.wsDocument.findMany({
      where,
      orderBy: { id: 'desc' },
    });

    return NextResponse.json({ success: true, data: docs });

  } catch (error) {
    logger.error('Get WS documents error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`wsdocs:post:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const { title, description, fileUrl, category } = body;

    if (!title || !fileUrl) {
      return NextResponse.json({ success: false, message: 'Title and file URL are required' }, { status: 400 });
    }

    const sanitizedUrl = sanitizeString(fileUrl, 500);
    if (!isValidUrl(sanitizedUrl)) {
      return NextResponse.json({ success: false, message: 'Invalid or disallowed URL' }, { status: 400 });
    }

    const newDoc = await prisma.wsDocument.create({
      data: {
        title: sanitizeString(title, 255),
        description: sanitizeString(description, 1000) || null,
        fileUrl: sanitizedUrl,
        category: sanitizeString(category, 100) || null,
      },
    });

    logger.info('WS document created', { adminId: authResult.user?.userId, docId: newDoc.id });

    return NextResponse.json({ success: true, data: newDoc, message: 'Document added successfully' });

  } catch (error) {
    logger.error('Create WS document error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`wsdocs:put:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const { id, title, description, fileUrl, category } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = sanitizeString(title, 255);
    if (description !== undefined) updateData.description = sanitizeString(description, 1000) || null;
    if (fileUrl) {
      const sanitizedUrl = sanitizeString(fileUrl, 500);
      if (!isValidUrl(sanitizedUrl)) {
        return NextResponse.json({ success: false, message: 'Invalid or disallowed URL' }, { status: 400 });
      }
      updateData.fileUrl = sanitizedUrl;
    }
    if (category !== undefined) updateData.category = sanitizeString(category, 100) || null;

    const updatedDoc = await prisma.wsDocument.update({
      where: { id },
      data: updateData,
    });

    logger.info('WS document updated', { adminId: authResult.user?.userId, docId: id });

    return NextResponse.json({ success: true, data: updatedDoc, message: 'Document updated successfully' });

  } catch (error) {
    logger.error('Update WS document error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit(`wsdocs:delete:${clientIp}`);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    await prisma.wsDocument.delete({ where: { id } });

    logger.info('WS document deleted', { adminId: authResult.user?.userId, docId: id });

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    logger.error('Delete WS document error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
