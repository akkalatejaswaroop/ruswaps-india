"use client";
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Share2, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CourtCase {
  id: string;
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  status: string;
  filingDate: string | null;
  registrationDate: string | null;
  nextHearingDate: string | null;
  lastHearingDate: string | null;
  petitioner: string;
  respondent: string;
  advocate: string | null;
  judge: string | null;
  actSection: string | null;
  courtName: string | null;
  stateName: string;
  districtCode: string;
  districtName: string;
  mandalCode: string | null;
  mandalName: string | null;
  syncedAt: string;
}

interface CaseHearing {
  id: string;
  hearingDate: string;
  purpose: string | null;
  nextDate: string | null;
  orderRemarks: string | null;
}

interface PageClientProps {
  courtCase: CourtCase;
  hearingHistory: CaseHearing[];
  isWatching: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, string> = {
    disposed: 'bg-green-100 text-green-700',
    'next hearing': 'bg-amber-100 text-amber-700',
    pending: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = {
    disposed: 'Disposed',
    'next hearing': 'Next Hearing',
    pending: 'Pending',
  };
  const normalizedStatus = status.toLowerCase();
  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${badges[normalizedStatus] || 'bg-gray-100 text-gray-700'}`}>
      {labels[normalizedStatus] || status}
    </span>
  );
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function isWithinDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  const diff = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function HearingRow({ hearing }: { hearing: CaseHearing }) {
  const [expanded, setExpanded] = useState(false);
  const remarks = hearing.orderRemarks || '';
  const isLong = remarks.length > 80;
  const displayRemarks = isLong && !expanded ? `${remarks.substring(0, 80)}...` : remarks;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        {formatDate(hearing.hearingDate)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {hearing.purpose || '—'}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
        {formatDate(hearing.nextDate)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        <div className="max-w-md">
          <span>{displayRemarks}</span>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
            >
              {expanded ? (
                <><ChevronUp size={14} /> Less</>
              ) : (
                <><ChevronDown size={14} /> More</>
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CourtCaseDetailClient({ courtCase, hearingHistory, isWatching: initialIsWatching }: PageClientProps) {
  const router = useRouter();
  const [isWatching, setIsWatching] = useState(initialIsWatching);
  const [watchLoading, setWatchLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addedToDir, setAddedToDir] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleWatchToggle = async () => {
    setWatchLoading(true);
    try {
      if (isWatching) {
        const res = await fetch('/api/courts/watch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cnrNumber: courtCase.cnrNumber }),
        });
        if (res.ok) setIsWatching(false);
      } else {
        const res = await fetch('/api/courts/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cnrNumber: courtCase.cnrNumber }),
        });
        if (res.ok) setIsWatching(true);
      }
    } catch (err) {
      console.error('Watch toggle error:', err);
    }
    setWatchLoading(false);
  };

  const handleAddToDirectory = async () => {
    setAddLoading(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caseNo: courtCase.caseNumber,
          caseYear: new Date().getFullYear(),
          caseType: courtCase.caseType,
          courtName: courtCase.courtName,
          hearingDate: courtCase.nextHearingDate ? courtCase.nextHearingDate.split('T')[0] : '',
          status: courtCase.status.toLowerCase().replace(' ', '_'),
        }),
      });
      if (res.ok) {
        setAddedToDir(true);
      }
    } catch (err) {
      console.error('Add to directory error:', err);
    }
    setAddLoading(false);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const nextHearingUrgent = isWithinDays(courtCase.nextHearingDate, 7);
  const lastHearingUrgent = isWithinDays(courtCase.lastHearingDate, 7);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/courts"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            <span>← Back to eCourts Cases</span>
          </Link>
          <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm ${
              copied ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'Copied!' : 'Share case'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{courtCase.caseNumber}</h1>
                <p className="text-gray-500 font-mono text-sm mt-1">CNR: {courtCase.cnrNumber}</p>
              </div>
              <StatusBadge status={courtCase.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
              <div>
                <p className="text-sm text-gray-500 mb-1">Court Name</p>
                <p className="font-medium text-gray-900">{courtCase.courtName || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">District</p>
                <p className="font-medium text-gray-900">{courtCase.districtName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Mandal</p>
                <p className="font-medium text-gray-900">{courtCase.mandalName || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Case Type</p>
                <p className="font-medium text-gray-900">{courtCase.caseType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Filing Date</p>
                <p className="font-medium text-gray-900">{formatDate(courtCase.filingDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Registration Date</p>
                <p className="font-medium text-gray-900">{formatDate(courtCase.registrationDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Judge</p>
                <p className="font-medium text-gray-900">{courtCase.judge || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Act / Section</p>
                <p className="font-medium text-gray-900">{courtCase.actSection || '—'}</p>
              </div>
              <div>
                <p className={`text-sm mb-1 ${lastHearingUrgent ? 'text-amber-600' : 'text-gray-500'}`}>Last Hearing</p>
                <p className={`font-medium ${lastHearingUrgent ? 'text-amber-700' : 'text-gray-900'}`}>
                  {formatDate(courtCase.lastHearingDate)}
                </p>
              </div>
              <div>
                <p className={`text-sm mb-1 ${nextHearingUrgent ? 'text-amber-600' : 'text-gray-500'}`}>Next Hearing</p>
                <p className={`font-medium ${nextHearingUrgent ? 'text-amber-700' : 'text-gray-900'}`}>
                  {formatDate(courtCase.nextHearingDate)}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={handleAddToDirectory}
                disabled={addLoading || addedToDir}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm transition ${
                  addedToDir
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {addLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : addedToDir ? (
                  <><Check size={16} /> Added</>
                ) : (
                  <><Plus size={16} /> Add to Case Directory</>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Petitioner(s)</p>
                <p className="text-gray-900 whitespace-pre-wrap">{courtCase.petitioner}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Respondent(s)</p>
                <p className="text-gray-900 whitespace-pre-wrap">{courtCase.respondent}</p>
              </div>
            </div>
            {courtCase.advocate && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Advocate on Record: <span className="font-medium text-gray-700">{courtCase.advocate}</span>
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Hearing history
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                  ({hearingHistory.length} records)
                </span>
              </h2>
            </div>
            {hearingHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hearing history available yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hearingHistory.map((hearing) => (
                      <HearingRow key={hearing.id} hearing={hearing} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleWatchToggle}
              disabled={watchLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                isWatching
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              <Bookmark size={18} fill={isWatching ? 'currentColor' : 'none'} />
              {isWatching ? 'Watching' : 'Watch case'}
            </button>
          </div>
          <p className="text-sm text-gray-400">
            Source: eCourts India · Last synced {getRelativeTime(courtCase.syncedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
