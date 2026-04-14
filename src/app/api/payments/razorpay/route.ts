import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

const SUBSCRIPTION_PLANS = {
  monthly: {
    price: 99,
    duration: 30,
    name: 'Monthly Subscription',
  },
  annual: {
    price: 799,
    duration: 365,
    name: 'Annual Subscription',
  },
} as const;

type PlanType = keyof typeof SUBSCRIPTION_PLANS;

let razorpay: Razorpay | null = null;

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';
    const rateLimitResult = await checkRateLimit(`payment:${clientIp}`, 'payment');
    
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many payment requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const body = await request.json();
    const { plan } = body;

    if (!plan || !SUBSCRIPTION_PLANS[plan as PlanType]) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription plan' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const planConfig = SUBSCRIPTION_PLANS[plan as PlanType];
    const amount = planConfig.price;
    const currency = 'INR';

    const options = {
      amount: amount * 100,
      currency,
      receipt: `rcp_${user.userId}_${Date.now()}`,
      notes: { userId: user.userId, plan },
    };

    let order;

    if (razorpay) {
      try {
        order = await razorpay.orders.create(options);
      } catch (razorpayError) {
        logger.error('Razorpay order creation failed', razorpayError, { userId: user.userId });
        return NextResponse.json(
          { success: false, message: 'Failed to create payment order' },
          { status: 500, headers: rateLimitHeaders }
        );
      }
    } else {
      if (isProduction) {
        logger.error('Razorpay not configured in production', null, { userId: user.userId });
        return NextResponse.json(
          { success: false, message: 'Payment processing not available' },
          { status: 503, headers: rateLimitHeaders }
        );
      }
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

    try {
      await prisma.subscription.create({
        data: {
          userId: user.userId,
          plan,
          amount: amount,
          orderId: order.id,
          status: 'pending',
          startDate: new Date(),
          endDate: new Date(Date.now() + planConfig.duration * 24 * 60 * 60 * 1000),
        },
      });
    } catch (dbError) {
      logger.error('Failed to create subscription record', dbError, { userId: user.userId, orderId: order.id });
      return NextResponse.json(
        { success: false, message: 'Failed to create subscription' },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        plan,
      },
    }, { headers: rateLimitHeaders });

  } catch (error) {
    logger.error('Razorpay order error', error);
    return NextResponse.json({ success: false, message: 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, message: 'Missing payment details' }, { status: 400 });
    }

    const orderIdRegex = /^order_[a-zA-Z0-9]+$/;
    const paymentIdRegex = /^pay_[a-zA-Z0-9]+$/;
    const signatureRegex = /^[a-f0-9]{64}$/;

    if (!orderIdRegex.test(razorpay_order_id) || !paymentIdRegex.test(razorpay_payment_id) || !signatureRegex.test(razorpay_signature)) {
      return NextResponse.json({ success: false, message: 'Invalid payment details format' }, { status: 400 });
    }

    if (!RAZORPAY_KEY_SECRET) {
      logger.error('Razorpay secret not configured', null, { userId: user.userId });
      return NextResponse.json({ success: false, message: 'Payment verification not available' }, { status: 503 });
    }

    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      logger.warn('Payment signature mismatch', { userId: user.userId, orderId: razorpay_order_id });
      return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { orderId: razorpay_order_id, userId: user.userId },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.status === 'completed') {
      return NextResponse.json({ success: false, message: 'Subscription already activated' }, { status: 400 });
    }

    const planConfig = SUBSCRIPTION_PLANS[subscription.plan as PlanType];
    if (!planConfig) {
      logger.error('Invalid subscription plan in database', null, { userId: user.userId, plan: subscription.plan });
      return NextResponse.json({ success: false, message: 'Invalid subscription plan' }, { status: 400 });
    }

    const startDate = new Date();
    const endDate = new Date(Date.now() + planConfig.duration * 24 * 60 * 60 * 1000);

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
    logger.error('Payment verification error', error);
    return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 500 });
  }
}
