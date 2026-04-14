import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

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

async function verifyAdmin(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const token = request.cookies.get('accessToken')?.value;
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;
  if (!('role' in payload) || (payload as { role: string }).role !== 'ADMIN') {
    return null;
  }
  
  return { userId: (payload as { userId: string }).userId, role: (payload as { role: string }).role };
}

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || '';

interface NotificationPayload {
  userId?: string;
  title: string;
  message: string;
  data?: Record<string, string>;
  url?: string;
}

function sanitizeString(str: unknown, maxLength: number = 255): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

async function sendOneSignalNotification(payload: Record<string, unknown>) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.log('OneSignal not configured, skipping notification');
    return { id: `mock_${Date.now()}` };
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`OneSignal API error: ${response.status}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`onesignal:post:${clientIp}`, 'api');
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders });
    }

    const body: NotificationPayload = await request.json();
    const { userId, title, message, data, url } = body;

    const sanitizedTitle = sanitizeString(title, 255);
    const sanitizedMessage = sanitizeString(message, 1000);
    const sanitizedUrl = sanitizeString(url, 500);

    if (!sanitizedTitle || !sanitizedMessage) {
      return NextResponse.json({ success: false, message: 'Title and message are required' }, { status: 400 });
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const sanitizedData: Record<string, string> = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          sanitizedData[key.slice(0, 50)] = value.slice(0, 100);
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { playerId: true },
    });

    if (!user?.playerId) {
      return NextResponse.json({ success: false, message: 'User player ID not found' }, { status: 404 });
    }

    const notification: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: sanitizedTitle },
      contents: { en: sanitizedMessage },
      data: sanitizedData,
      url: sanitizedUrl || 'https://ruswaps.in',
      include_player_ids: [user.playerId],
    };

    await prisma.notification.create({
      data: {
        userId,
        title: sanitizedTitle,
        message: sanitizedMessage,
        type: 'push',
        data: sanitizedData,
      },
    });

    const result = await sendOneSignalNotification(notification);

    return NextResponse.json({
      success: true,
      message: 'Notification sent',
      data: { notificationId: result.id },
    });

  } catch (error) {
    console.error('OneSignal error:', { code: 'NOTIFICATION_SEND_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Failed to send notification' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`onesignal:put:${clientIp}`, 'api');
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders });
    }

    const body: NotificationPayload = await request.json();
    const { title, message, data, url } = body;

    const sanitizedTitle = sanitizeString(title, 255);
    const sanitizedMessage = sanitizeString(message, 1000);
    const sanitizedUrl = sanitizeString(url, 500);

    if (!sanitizedTitle || !sanitizedMessage) {
      return NextResponse.json({ success: false, message: 'Title and message are required' }, { status: 400 });
    }

    const sanitizedData: Record<string, string> = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          sanitizedData[key.slice(0, 50)] = value.slice(0, 100);
        }
      }
    }

    const notification = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: sanitizedTitle },
      contents: { en: sanitizedMessage },
      data: sanitizedData,
      url: sanitizedUrl || 'https://ruswaps.in',
    };

    const result = await sendOneSignalNotification(notification);

    return NextResponse.json({
      success: true,
      message: 'Broadcast notification sent',
      data: { notificationId: result.id, recipients: 'all' },
    });

  } catch (error) {
    console.error('OneSignal broadcast error:', { code: 'BROADCAST_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Failed to send broadcast' }, { status: 500 });
  }
}
