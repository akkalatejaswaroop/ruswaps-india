"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, X, Clock } from 'lucide-react';

interface WatchedCase {
  id: string;
  cnrNumber: string;
  caseNumber: string;
  courtName: string | null;
  districtName: string;
  status: string;
  nextHearingDate: string | null;
  petitioner: string;
  respondent: string;
}

function getDaysUntil(date: string | null): number {
  if (!date) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hearing = new Date(date);
  hearing.setHours(0, 0, 0, 0);
  return Math.ceil((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: string | null): { day: string; month: string } | null {
  if (!date) return null;
  const d = new Date(date);
  return {
    day: d.toLocaleDateString('en-IN', { day: '2-digit' }),
    month: d.toLocaleDateString('en-IN', { month: 'short' }),
  };
}

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, string> = {
    disposed: 'bg-green-100 text-green-700',
    'next hearing': 'bg-amber-100 text-amber-700',
    pending: 'bg-blue-100 text-blue-700',
  };
  const normalizedStatus = status.toLowerCase();
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[normalizedStatus] || badges.pending}`}>
      {normalizedStatus === 'next hearing' ? 'Next Hearing' : status}
    </span>
  );
}

function CaseCard({ courtCase, onUnwatch }: { courtCase: WatchedCase; onUnwatch: (cnrNumber: string) => void }) {
  const dateInfo = formatDate(courtCase.nextHearingDate);
  const days = getDaysUntil(courtCase.nextHearingDate);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition">
      {dateInfo ? (
        <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
          days <= 0 ? 'bg-gray-100' : days <= 3 ? 'bg-red-100' : days <= 7 ? 'bg-amber-100' : 'bg-blue-100'
        }`}>
          <span className={`text-lg font-bold ${
            days <= 0 ? 'text-gray-600' : days <= 3 ? 'text-red-700' : days <= 7 ? 'text-amber-700' : 'text-blue-700'
          }`}>{dateInfo.day}</span>
          <span className={`text-xs ${
            days <= 0 ? 'text-gray-500' : days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-blue-600'
          }`}>{dateInfo.month}</span>
        </div>
      ) : (
        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Calendar size={24} className="text-gray-400" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <Link href={`/courts/${courtCase.cnrNumber}`} className="font-medium text-gray-900 hover:text-primary">
          {courtCase.caseNumber}
        </Link>
        <p className="text-sm text-gray-600 truncate">{courtCase.courtName || '—'} · {courtCase.districtName}</p>
        <p className="text-sm text-gray-500 truncate">
          {courtCase.petitioner} v. {courtCase.respondent}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={courtCase.status} />
        <button
          onClick={() => onUnwatch(courtCase.cnrNumber)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          title="Unwatch"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [watchedCases, setWatchedCases] = useState<WatchedCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchedCases();
  }, []);

  const fetchWatchedCases = async () => {
    try {
      const res = await fetch('/api/courts/watched', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setWatchedCases(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch watched cases:', err);
    }
    setLoading(false);
  };

  const handleUnwatch = async (cnrNumber: string) => {
    try {
      const res = await fetch('/api/courts/watch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cnrNumber }),
      });
      if (res.ok) {
        setWatchedCases(prev => prev.filter(c => c.cnrNumber !== cnrNumber));
      }
    } catch (err) {
      console.error('Failed to unwatch:', err);
    }
  };

  const thisWeek: WatchedCase[] = [];
  const nextWeek: WatchedCase[] = [];
  const later: WatchedCase[] = [];
  const noDate: WatchedCase[] = [];

  for (const c of watchedCases) {
    const days = getDaysUntil(c.nextHearingDate);
    if (c.nextHearingDate === null || days <= 0) {
      noDate.push(c);
    } else if (days <= 7) {
      thisWeek.push(c);
    } else if (days <= 14) {
      nextWeek.push(c);
    } else {
      later.push(c);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/courts"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ArrowLeft size={20} />
            Back to eCourts Cases
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Hearing Calendar</h1>
          <p className="text-gray-500 mt-1">Watched cases sorted by upcoming hearings</p>
        </div>

        {watchedCases.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">You haven&apos;t watched any cases yet.</h3>
            <p className="text-gray-500 mb-4">
              Find cases in eCourts Cases and click the bookmark icon to watch them.
            </p>
            <Link
              href="/courts"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Browse eCourts Cases →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {thisWeek.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock size={20} className="text-red-500" />
                  This week
                  <span className="text-sm font-normal text-gray-500">({thisWeek.length})</span>
                </h2>
                <div className="space-y-3">
                  {thisWeek.map(c => (
                    <CaseCard key={c.id} courtCase={c} onUnwatch={handleUnwatch} />
                  ))}
                </div>
              </div>
            )}

            {nextWeek.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock size={20} className="text-amber-500" />
                  Next week
                  <span className="text-sm font-normal text-gray-500">({nextWeek.length})</span>
                </h2>
                <div className="space-y-3">
                  {nextWeek.map(c => (
                    <CaseCard key={c.id} courtCase={c} onUnwatch={handleUnwatch} />
                  ))}
                </div>
              </div>
            )}

            {later.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar size={20} className="text-blue-500" />
                  Later
                  <span className="text-sm font-normal text-gray-500">({later.length})</span>
                </h2>
                <div className="space-y-3">
                  {later.map(c => (
                    <CaseCard key={c.id} courtCase={c} onUnwatch={handleUnwatch} />
                  ))}
                </div>
              </div>
            )}

            {noDate.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar size={20} className="text-gray-400" />
                  No date set
                  <span className="text-sm font-normal text-gray-500">({noDate.length})</span>
                </h2>
                <div className="space-y-3">
                  {noDate.map(c => (
                    <CaseCard key={c.id} courtCase={c} onUnwatch={handleUnwatch} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
