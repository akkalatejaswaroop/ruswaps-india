import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || '';

interface EmailNotificationPayload {
  to: string | string[];
  subject: string;
  body: string;
  name?: string;
  data?: Record<string, string>;
}

async function sendEmailViaOneSignal(payload: EmailNotificationPayload): Promise<{ id?: string; error?: string }> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    logger.warn('OneSignal email: API not configured');
    return { id: `mock_email_${Date.now()}` };
  }

  try {
    const emailPayload = {
      app_id: ONESIGNAL_APP_ID,
      email_subject: payload.subject,
      email_body: payload.body,
      emails: Array.isArray(payload.to) ? payload.to : [payload.to],
      ...(payload.data && { data: payload.data }),
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OneSignal email API error', { status: response.status, error: errorText });
      return { error: `API error: ${response.status}` };
    }

    const result = await response.json();
    return { id: result.id };
  } catch (error) {
    logger.error('OneSignal email send error', error);
    return { error: 'Failed to send email' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { to, subject, body: emailBody, name, data } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(to) ? to : [to];
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients.filter(r => emailRegex.test(r));
    
    if (validRecipients.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid email addresses provided' },
        { status: 400 }
      );
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #017c43 0%, #3dbfb7 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Ruswaps India</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          ${name ? `<h2 style="color: #017c43; margin-top: 0;">Dear ${name},</h2>` : ''}
          <div style="color: #374151; line-height: 1.6;">${emailBody.replace(/\n/g, '<br>')}</div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              This email was sent by Ruswaps India. For support, contact support@ruswaps.in
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">
              <a href="https://ruswaps.in" style="color: #017c43;">Visit Ruswaps</a> | 
              <a href="https://ruswaps.in/unsubscribe" style="color: #017c43;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </div>
    `;

    const result = await sendEmailViaOneSignal({
      to: validRecipients,
      subject,
      body: htmlBody,
      data,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 500 }
      );
    }

    await prisma.notification.create({
      data: {
        userId: user.userId,
        title: `Email: ${subject}`,
        message: `Sent to ${validRecipients.length} recipient(s)`,
        type: 'email',
        data: { 
          recipients: JSON.stringify(validRecipients), 
          subject,
          notificationId: result.id || ''
        },
      },
    });

    logger.info('Email notification sent', { 
      to: validRecipients, 
      subject, 
      notificationId: result.id 
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        notificationId: result.id,
        recipients: validRecipients.length,
      },
    });

  } catch (error) {
    logger.error('Email notification error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send email notification' },
      { status: 500 }
    );
  }
}
