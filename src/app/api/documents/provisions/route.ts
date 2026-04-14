import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 30;

const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || "127.0.0.1,::1").split(",").map(p => p.trim());

function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXIES.includes(ip);
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    for (const ip of ips) {
      if (!isTrustedProxy(ip)) {
        return ip;
      }
    }
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp && !isTrustedProxy(realIp)) {
    return realIp;
  }
  
  return "127.0.0.1";
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

interface Provision {
  id: string;
  act: string;
  section: string;
  title: string;
  description: string;
  content: string;
  relevance: string;
}

const provisions: Provision[] = [
  {
    id: "mva-140",
    act: "Motor Vehicles Act",
    section: "Section 140",
    title: "Death of passenger - Liability of owner",
    description: "In case of death of a passenger in a vehicle, the owner of the vehicle shall be liable to pay compensation to the legal heirs of the deceased.",
    content: "Section 140 of the Motor Vehicles Act, 1988 provides for liability to pay compensation in certain cases even without proof of negligence or wrongful act.\n\nKey Points:\n- Compensation is payable irrespective of negligence\n- Applies to death or grievous hurt to passengers\n- Owner is liable to pay compensation\n- Amount determined as per Section 163A schedule\n\nThis provision ensures immediate relief to victims without lengthy litigation.",
    relevance: "Accident Claims - Death Cases"
  },
  {
    id: "mva-141",
    act: "Motor Vehicles Act",
    section: "Section 141",
    title: "Nature of compensation",
    description: "The compensation payable under Section 140 shall be the amount specified in the Second Schedule.",
    content: "Section 141 specifies the nature and amount of compensation payable under Section 140.\n\nThe Second Schedule provides:\n- For death: Rs. 25,000 for funeral expenses plus fixed compensation based on age\n- For permanent disability: Percentage of compensation as per disability\n- For grievous hurt: As specified in the schedule",
    relevance: "Accident Claims - All Cases"
  },
  {
    id: "mva-163a",
    act: "Motor Vehicles Act",
    section: "Section 163A",
    title: "Special provision for compensation in certain cases of death",
    description: "In case of death of a person in a motor accident, the owner of the vehicle shall be liable to pay compensation as specified in the Second Schedule.",
    content: "Section 163A provides for payment of compensation to victims of motor accidents without establishing negligence.\n\nKey Points:\n- Applies to death or permanent disability\n- Compensation calculated based on age and income\n- No proof of negligence required\n- Third party insurance liable\n\nFormula for Compensation:\nAnnual Income multiplied by Multiplier based on age = Total Compensation\n\nAge Multipliers (Second Schedule):\n18-20: 228, 20-25: 229, 25-30: 228, 30-35: 227, 35-40: 226, 40-45: 223, 45-50: 220, 50-55: 217, 55-60: 214, 60+: 209",
    relevance: "Accident Claims - Death Cases"
  },
  {
    id: "mva-166",
    act: "Motor Vehicles Act",
    section: "Section 166",
    title: "Application for compensation",
    description: "An application for compensation arising out of a motor accident may be made to the Claims Tribunal having jurisdiction.",
    content: "Section 166 allows victims of motor accidents to file claims before the Motor Accident Claims Tribunal (MACT).\n\nFiling Requirements:\n- Application must be in prescribed form\n- Filed within 6 months of accident (extension possible)\n- Claim amount must be specified\n- Evidence of accident and injury must be provided\n\nJurisdiction:\n- Accident occurred within the jurisdiction of that Tribunal\n- Permanent address of claimant\n- Place where defendant resides or carries business",
    relevance: "Accident Claims - All Cases"
  },
  {
    id: "mva-168",
    act: "Motor Vehicles Act",
    section: "Section 168",
    title: "Award of compensation",
    description: "The Claims Tribunal shall, after giving notice to the parties and hearing them, determine the amount of compensation.",
    content: "Section 168 empowers the Claims Tribunal to determine and award compensation.\n\nFactors Considered:\n- Nature of injury and disability\n- Medical expenses incurred\n- Loss of income/earning capacity\n- Deceased age and income\n- Number of dependents\n- Funeral expenses\n- Future medical expenses\n- Pain and suffering\n\nThe Tribunal can award:\n- Compensation amount\n- Interest on the amount\n- Costs of proceedings",
    relevance: "Accident Claims - All Cases"
  },
  {
    id: "mva-170",
    act: "Motor Vehicles Act",
    section: "Section 170",
    title: "Insurance not to make payment in certain cases",
    description: "Insurance company shall not be liable to pay compensation in certain cases involving drunken driving or without valid license.",
    content: "Section 170 provides exceptions where insurance company can avoid liability.\n\nExceptions:\n- Driver under influence of alcohol/drugs\n- Vehicle used without valid license\n- Vehicle used for illegal purposes\n- Driver refusing breath analyzer test\n- Vehicle not covered by insurance\n\nNote: Even in these cases, victim can claim from the owner directly.",
    relevance: "Insurance Liability Cases"
  },
  {
    id: "mva-173",
    act: "Motor Vehicles Act",
    section: "Section 173",
    title: "Appeals",
    description: "Any person aggrieved by the decision of the Claims Tribunal may appeal to the High Court.",
    content: "Section 173 provides for appeal against the Tribunals decision.\n\nAppeal Process:\n- File within 60 days of award\n- High Court has jurisdiction\n- Appeal on facts and law\n- Stay of execution can be sought\n- Expedited hearing possible\n\nLimited Scope of Appeal:\n- Interference only if decision perverse\n- New evidence rarely admitted\n- Questions of law can be raised",
    relevance: "Post-Award Proceedings"
  },
  {
    id: "ec-3",
    act: "Employee Compensation Act",
    section: "Section 3",
    title: "Employers liability for compensation",
    description: "If personal injury is caused to a workman by accident arising out of and in the course of his employment, the employer shall be liable to pay compensation.",
    content: "Section 3 is the core provision of the Employees Compensation Act, 1923.\n\nElements of Liability:\n- Personal injury caused to workman\n- By accident\n- Arising out of employment\n- In the course of employment\n\nExceptions (Section 3(2)):\n- Injury not attributable to employment\n- Disease manifestly unconnected with employment\n- Injury due to employees serious misconduct (limited cases)\n\nThree Types of Claims:\n1. Death - Schedule II\n2. Permanent total disablement - Schedule I\n3. Permanent partial disablement - Schedule I\n4. Temporary disablement - Schedule III",
    relevance: "Employee Compensation - All Cases"
  },
  {
    id: "ec-4",
    act: "Employee Compensation Act",
    section: "Section 4",
    title: "Amount of compensation",
    description: "The compensation shall be paid as per the rates specified in Schedules I, II, III, and IV of the Act.",
    content: "Section 4 prescribes the calculation of compensation.\n\nFor Death:\n- 50% of monthly wages multiplied by relevant factor\n- Plus Rs. 50,000 for funeral expenses\n- Minimum: Rs. 80,000\n\nFor Permanent Total Disablement:\n- 60% of monthly wages multiplied by relevant factor\n- Minimum: Rs. 90,000\n\nFor Permanent Partial Disablement:\n- Proportionate to loss of earning capacity\n- Based on Schedule I percentage\n\nRelevant Factor based on age (Schedule IV):\n18-19: 228, 19-20: 227, decreasing to 160 at age 60+",
    relevance: "Employee Compensation - Calculation"
  },
  {
    id: "ec-12",
    act: "Employee Compensation Act",
    section: "Section 12",
    title: "Commissioner for Employees Compensation",
    description: "The appropriate Government may, by notification, appoint a Commissioner for Employees Compensation.",
    content: "Section 12 establishes the Commissioner for Employees Compensation.\n\nCommissioner Powers:\n- Adjudicate disputes regarding compensation\n- Direct deposit of compensation\n- Summon and examine witnesses\n- Award interest on delayed payment\n- Penalties for default\n\nFiling a Claim:\n- File before Commissioner having jurisdiction\n- Within 1 year of accident (can be extended)\n- Form A for claims\n- Respondent: Employer and/or Insurance",
    relevance: "Employee Compensation - Procedure"
  }
];

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitCheck = await checkRateLimit("provisions:get:" + clientIp);
    if (!rateLimitCheck) {
      return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const act = searchParams.get("act");

    let filteredProvisions = provisions;
    if (act) {
      filteredProvisions = provisions.filter(p => p.act.toLowerCase().includes(act.toLowerCase()));
    }

    return NextResponse.json({ success: true, data: filteredProvisions });

  } catch (error) {
    console.error("Get provisions error:", { code: "GET_PROVISIONS_FAILED", timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
