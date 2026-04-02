import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

interface OrderRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  plan: 'monthly' | 'annual';
  notes?: Record<string, string>;
}

function getAuthUser(request: NextRequest): { userId: string } | null {
  const token = request.cookies.get('accessToken')?.value || request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || 'type' in payload) return null;
  return { userId: payload.userId };
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body: OrderRequest = await request.json();
    const { amount, currency = 'INR', receipt, plan, notes = {} } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcp_${Date.now()}`,
      notes: { ...notes, userId: user.userId, plan },
    };

    let order;
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      order = await razorpay.orders.create(options);
    } else {
      order = {
        id: `order_${Date.now()}`,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    await prisma.subscription.create({
      data: {
        userId: user.userId,
        plan,
        amount: amount,
        orderId: order.id,
        status: 'pending',
        startDate: new Date(),
        endDate: plan === 'monthly' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });

  } catch (error) {
    console.error('Razorpay order error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, message: 'Missing payment details' }, { status: 400 });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { orderId: razorpay_order_id, userId: user.userId },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
    }

    const duration = plan === 'monthly' ? 30 : 365;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          paymentId: razorpay_payment_id,
          status: 'completed',
          startDate,
          endDate,
        },
      }),
      prisma.user.update({
        where: { id: user.userId },
        data: {
          isSubscribed: true,
          subscriptionExpiry: endDate,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        subscriptionExpiry: endDate,
      },
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 500 });
  }
}
