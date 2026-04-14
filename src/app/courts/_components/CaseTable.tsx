"use client";
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import WatchButton from './WatchButton';

interface CourtCase {
  id: string;
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  status: string;
  nextHearingDate: string | null;
  lastHearingDate: string | null;
  petitioner: string;
  respondent: string;
  courtName: string | null;
  districtName: string;
  mandalName: string | null;
}

interface CaseTableProps {
  cases: CourtCase[];
  loading?: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onWatchChange?: (cnrNumber: string, isWatching: boolean) => void;
  watchedCnrs?: Set<string>;
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
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[normalizedStatus] || 'bg-gray-100 text-gray-700'}`}>
      {labels[normalizedStatus] || status}
    </span>
  );
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return 'Past';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return `${diff} days`;

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncatePartyName(name: string, maxLength = 40): { display: string; full: string } {
  return {
    display: name.length > maxLength ? `${name.substring(0, maxLength)}...` : name,
    full: name,
  };
}

export default function CaseTable({
  cases,
  loading = false,
  page,
  totalPages,
  total,
  onPageChange,
  onWatchChange,
  watchedCnrs = new Set(),
}: CaseTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="animate-pulse p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Search size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No cases found</h3>
        <p className="text-gray-500">No cases found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNR Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Court & District</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petitioner vs Respondent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Hearing</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Watch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases.map((courtCase) => {
              const petitionerTrunc = truncatePartyName(courtCase.petitioner);
              const respondentTrunc = truncatePartyName(courtCase.respondent);
              const hearingDisplay = formatRelativeDate(courtCase.nextHearingDate);
              const isUrgent = hearingDisplay === 'Today' || hearingDisplay === 'Tomorrow';

              return (
                <tr key={courtCase.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-4">
                    <Link href={`/courts/${courtCase.cnrNumber}`} className="font-medium text-primary hover:underline">
                      {courtCase.caseNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                    {courtCase.cnrNumber}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <div>{courtCase.courtName || '—'}</div>
                    <div className="text-gray-400">{courtCase.districtName}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <span title={petitionerTrunc.full}>{petitionerTrunc.display}</span>
                    <span className="text-gray-400 mx-1">v.</span>
                    <span title={respondentTrunc.full}>{respondentTrunc.display}</span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={courtCase.status} />
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isUrgent
                        ? 'bg-red-100 text-red-700'
                        : hearingDisplay === '—'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {hearingDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <WatchButton
                      cnrNumber={courtCase.cnrNumber}
                      isWatching={watchedCnrs.has(courtCase.cnrNumber)}
                      onWatchChange={onWatchChange}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} cases
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
