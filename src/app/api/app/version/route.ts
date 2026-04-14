import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      version: '1.0.0',
      minVersion: '1.0.0',
      forceUpdate: false,
      playstoreUrl: 'https://play.google.com/store/apps/details?id=io.ionic.starterMVAECClaims',
      paymentPrice: {
        monthly: 299,
        annual: 1999,
      },
      paymentAllowDays: 30,
      deathCount: 200000,
      injuriesCount: 50000,
    },
  });
}
