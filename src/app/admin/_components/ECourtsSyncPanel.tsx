"use client";
import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Play, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SyncLog {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  totalFetched: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  triggeredBy: string;
  createdAt: string;
}

function getRelativeTime(date: string): string {
  const now = new Date();
  const d = new Date(date);
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

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const seconds = ((end - start) / 1000).toFixed(1);
  return `${seconds}s`;
}

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    running: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Running' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  };
  const config = badges[status.toLowerCase()] || badges.pending;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function ECourtsSyncPanel() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastAvailableAt, setLastAvailableAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!lastAvailableAt) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = lastAvailableAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown(null);
        setLastAvailableAt(null);
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastAvailableAt]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/courts/sync-logs', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data?.logs || []);
        
        if (data.data?.logs?.length > 0) {
          const latest = data.data.logs[0];
          if (latest.status === 'running' && latest.triggeredBy === 'admin') {
            const thirtyMinsFromNow = new Date(Date.now() + 30 * 60000);
            setLastAvailableAt(thirtyMinsFromNow);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/courts/sync', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Sync started. Check logs below.' });
        const thirtyMinsFromNow = new Date(Date.now() + 30 * 60000);
        setLastAvailableAt(thirtyMinsFromNow);
        fetchLogs();
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed to start' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start sync' });
    }
    
    setSyncing(false);
  };

  const latestLog = logs[0];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">eCourts Sync</h2>
        <p className="text-gray-500 mt-1">Manage eCourts case data synchronization</p>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Sync Control</h3>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <button
            onClick={handleSync}
            disabled={syncing || !!countdown}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {syncing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Play size={18} />
                Run sync now
              </>
            )}
          </button>
          
          {countdown && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={16} />
              Available in {countdown}
            </div>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} className="inline mr-2" /> : <XCircle size={16} className="inline mr-2" />}
            {message.text}
          </div>
        )}

        {latestLog && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Last sync</p>
              <p className="text-sm font-medium text-gray-900">{getRelativeTime(latestLog.startedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <StatusBadge status={latestLog.status} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Fetched</p>
              <p className="text-sm font-medium text-gray-900">{latestLog.totalFetched}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Updated</p>
              <p className="text-sm font-medium text-gray-900">{latestLog.totalUpdated}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Errors</p>
              <p className="text-sm font-medium text-gray-900">{latestLog.totalErrors}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Recent Sync History</h3>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No sync logs available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Started At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fetched</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Skipped</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(log.startedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDuration(log.startedAt, log.completedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.totalFetched}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.totalUpdated}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.totalSkipped}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.totalErrors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}