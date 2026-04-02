import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || '';

interface NotificationPayload {
  userId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  url?: string;
}

async function sendOneSignalNotification(payload: Record<string, any>) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.log('OneSignal not configured, logging only:', payload);
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
    throw new Error(`OneSignal API error: ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationPayload = await request.json();
    const { userId, title, message, data, url } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, message: 'Title and message are required' }, { status: 400 });
    }

    const notification: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      data: data || {},
      url: url || 'https://ruswaps.in',
    };

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { playerId: true },
      });

      if (user?.playerId) {
        notification.include_player_ids = [user.playerId];
      } else {
        return NextResponse.json({ success: false, message: 'User player ID not found' }, { status: 404 });
      }

      await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: 'push',
          data: data || {},
        },
      });
    } else {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const result = await sendOneSignalNotification(notification);

    return NextResponse.json({
      success: true,
      message: 'Notification sent',
      data: { notificationId: result.id },
    });

  } catch (error) {
    console.error('OneSignal error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send notification' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: NotificationPayload = await request.json();
    const { title, message, data, url } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, message: 'Title and message are required' }, { status: 400 });
    }

    const notification = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: title },
      contents: { en: message },
      data: data || {},
      url: url || 'https://ruswaps.in',
    };

    const result = await sendOneSignalNotification(notification);

    return NextResponse.json({
      success: true,
      message: 'Broadcast notification sent',
      data: { notificationId: result.id, recipients: 'all' },
    });

  } catch (error) {
    console.error('OneSignal broadcast error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send broadcast' }, { status: 500 });
  }
}
