import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(`acts:get:${clientIp}`, 'api');
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const actType = searchParams.get('type');

    const acts = {
      'mv-act': {
        id: 'mv-act',
        name: 'Motor Vehicles Act, 1988',
        shortName: 'MV Act',
        sections: [
          {
            section: 'Section 140',
            title: 'Liability without negligence',
            content: 'In case of death of a passenger in a vehicle, the owner of the vehicle shall be liable to pay compensation to the legal heirs of the deceased without proof of negligence or wrongful act.'
          },
          {
            section: 'Section 141',
            title: 'Nature of compensation',
            content: 'The compensation payable under Section 140 shall be as specified in the Second Schedule.'
          },
          {
            section: 'Section 147',
            title: 'Necessity for insurance',
            content: 'No person shall use a motor vehicle in a public place unless a certificate of insurance is in force in respect of third party risks.'
          },
          {
            section: 'Section 149',
            title: 'Duty of insurer',
            content: 'Where a certificate of insurance has been issued, the insurer shall be liable to pay to any person entitled to make a claim, the amount due under the policy.'
          },
          {
            section: 'Section 163A',
            title: 'Special provision for compensation',
            content: 'In case of death of a person in a motor accident, compensation shall be payable as per the Second Schedule irrespective of negligence.'
          },
          {
            section: 'Section 166',
            title: 'Application for compensation',
            content: 'An application for compensation arising out of a motor accident may be made to the Claims Tribunal having jurisdiction.'
          },
          {
            section: 'Section 168',
            title: 'Award of compensation',
            content: 'The Claims Tribunal shall, after giving notice and hearing the parties, determine the amount of compensation.'
          },
          {
            section: 'Section 169',
            title: 'Procedure and powers of Tribunal',
            content: 'The Claims Tribunal shall have the powers of a Civil Court for summoning witnesses, discovery, and production of documents.'
          },
          {
            section: 'Section 170',
            title: 'Insurance not liable in certain cases',
            content: 'Insurance company shall not be liable where driver was under influence of alcohol or vehicle used without valid license.'
          },
          {
            section: 'Section 173',
            title: 'Appeals',
            content: 'Any person aggrieved by the decision of the Claims Tribunal may appeal to the High Court within 60 days.'
          },
          {
            section: 'Section 174',
            title: 'Recovery of compensation',
            content: 'If the person liable to pay compensation fails to pay, the amount can be recovered as if it were a fine.'
          },
          {
            section: 'Section 176',
            title: 'Statute of limitations',
            content: 'A claim petition must be filed within 6 months from the date of accident. Extension may be granted if sufficient cause is shown.'
          }
        ]
      },
      'ec-act': {
        id: 'ec-act',
        name: 'Employee Compensation Act, 1923',
        shortName: 'EC Act',
        sections: [
          {
            section: 'Section 2',
            title: 'Definitions',
            content: 'Defines "workman", "employer", "employment injury", "Commissioner" and other key terms under the Act.'
          },
          {
            section: 'Section 3',
            title: 'Employer\'s liability',
            content: 'If personal injury is caused to a workman by accident arising out of and in the course of employment, the employer shall be liable to pay compensation.'
          },
          {
            section: 'Section 3(1)',
            title: 'Compensation not optional',
            content: 'The liability of employer under this Act is absolute and not dependent on any fault or negligence.'
          },
          {
            section: 'Section 3(2)',
            title: 'Exceptions',
            content: 'Employer is not liable if injury is solely attributable to workman\'s serious misconduct, or if the workman is under influence of alcohol or drugs.'
          },
          {
            section: 'Section 4',
            title: 'Amount of compensation',
            content: 'Compensation shall be paid as per Schedules I, II, III, and IV based on nature of injury and wages.'
          },
          {
            section: 'Section 4(1)(a)',
            title: 'Death compensation',
            content: '50% of monthly wages multiplied by relevant factor, plus Rs. 50,000 for funeral expenses.'
          },
          {
            section: 'Section 4(1)(b)',
            title: 'Permanent total disablement',
            content: '60% of monthly wages multiplied by relevant factor.'
          },
          {
            section: 'Section 5',
            title: 'Method of calculating wages',
            content: 'Monthly wages calculated based on average daily wages multiplied by applicable days in a month.'
          },
          {
            section: 'Section 6',
            title: 'Review',
            content: 'Commissioners can review half-monthly payments if the disability changes or workman returns to work.'
          },
          {
            section: 'Section 7',
            title: 'Compensation not to be assigned',
            content: 'Compensation payable shall not be capable of being assigned, charged, or attached.'
          },
          {
            section: 'Section 8',
            title: 'Contracting out',
            content: 'Any agreement by a workman to waive his right to compensation shall be void.'
          },
          {
            section: 'Section 12',
            title: 'Commissioner appointment',
            content: 'State Government may appoint Commissioners to adjudicate claims under this Act.'
          },
          {
            section: 'Section 13',
            title: 'Jurisdiction',
            content: 'Claims can be filed where accident occurred, where employer resides, or where the workman usually works.'
          },
          {
            section: 'Section 19',
            title: 'Limitation',
            content: 'Claim must be filed within 1 year from the date of accident. Extension possible with sufficient cause.'
          },
          {
            section: 'Section 30',
            title: 'Appeals',
            content: 'Appeals against Commissioner\'s decision lie to the High Court within 60 days.'
          }
        ]
      }
    };

    if (actType && acts[actType as keyof typeof acts]) {
      return NextResponse.json({ success: true, data: acts[actType as keyof typeof acts] });
    }

    return NextResponse.json({ success: true, data: acts });

  } catch (error) {
    console.error('Get acts error:', { code: 'GET_ACTS_FAILED', timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
