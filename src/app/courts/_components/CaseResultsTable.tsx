"use client";
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import WatchToggle from './WatchToggle';

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
  court: string;
  state: string;
  district: string;
}

interface CaseResultsTableProps {
  cases: CourtCase[];
  loading?: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onWatchChange?: (cnrNumber: string, isWatching: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700',
    disposed: 'bg-green-100 text-green-700',
    'next hearing': 'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    disposed: 'Disposed',
    'next hearing': 'Next Hearing',
  };
  
  const normalizedStatus = status.toLowerCase();
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[normalizedStatus] || badges.pending}`}>
      {labels[normalizedStatus] || status}
    </span>
  );
}

function getDaysUntilHearing(date: string | null): string {
  if (!date) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hearing = new Date(date);
  const diff = Math.ceil((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Past';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days`;
}

export default function CaseResultsTable({
  cases,
  loading = false,
  page,
  totalPages,
  total,
  onPageChange,
  onWatchChange,
}: CaseResultsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="animate-pulse space-y-4 p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg" />
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
        <p className="text-gray-500">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case No.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNR</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Petitioner vs Respondent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Hearing</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Watch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases.map((courtCase) => (
              <tr key={courtCase.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <Link href={`/courts/${courtCase.cnrNumber}`} className="font-medium text-primary hover:underline">
                    {courtCase.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 font-mono">{courtCase.cnrNumber}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{courtCase.court}</td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  <span className="text-gray-900">{courtCase.petitioner}</span>
                  <span className="text-gray-400 mx-1">vs</span>
                  <span className="text-gray-900">{courtCase.respondent}</span>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={courtCase.status} />
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getDaysUntilHearing(courtCase.nextHearingDate) === 'Today' || getDaysUntilHearing(courtCase.nextHearingDate) === 'Tomorrow'
                      ? 'bg-red-100 text-red-700'
                      : getDaysUntilHearing(courtCase.nextHearingDate) === 'Past'
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {getDaysUntilHearing(courtCase.nextHearingDate)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <WatchToggle
                    cnrNumber={courtCase.cnrNumber}
                    isWatching={false}
                    onWatchChange={onWatchChange}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}