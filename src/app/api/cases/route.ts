import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getAuthUser(request: NextRequest): { userId: string } | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return { userId };
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cases = await prisma.case.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: cases });

  } catch (error) {
    console.error('Get cases error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { caseNo, caseYear, caseType, courtName, hearingDate, postedFor, status } = body;

    if (!caseNo || !caseYear || !caseType) {
      return NextResponse.json({ success: false, message: 'Case number, year, and type are required' }, { status: 400 });
    }

    const newCase = await prisma.case.create({
      data: {
        userId: user.userId,
        caseNo,
        caseYear,
        caseType,
        courtName: courtName || '',
        hearingDate: hearingDate ? new Date(hearingDate) : null,
        postedFor: postedFor || '',
        status: status || 'pending',
      },
    });

    return NextResponse.json({ success: true, data: newCase, message: 'Case created successfully' });

  } catch (error) {
    console.error('Create case error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, ...updates } = body;

    if (!caseId) {
      return NextResponse.json({ success: false, message: 'Case ID is required' }, { status: 400 });
    }

    const existingCase = await prisma.case.findFirst({
      where: { id: caseId, userId: user.userId },
    });

    if (!existingCase) {
      return NextResponse.json({ success: false, message: 'Case not found' }, { status: 404 });
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        ...updates,
        hearingDate: updates.hearingDate ? new Date(updates.hearingDate) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updatedCase, message: 'Case updated successfully' });

  } catch (error) {
    console.error('Update case error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({ success: false, message: 'Case ID is required' }, { status: 400 });
    }

    const existingCase = await prisma.case.findFirst({
      where: { id: caseId, userId: user.userId },
    });

    if (!existingCase) {
      return NextResponse.json({ success: false, message: 'Case not found' }, { status: 404 });
    }

    await prisma.case.delete({ where: { id: caseId } });

    return NextResponse.json({ success: true, message: 'Case deleted successfully' });

  } catch (error) {
    console.error('Delete case error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
