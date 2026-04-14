"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, Calculator, FileText,
  Bell, Search, RefreshCw, Download, TrendingUp, TrendingDown,
  DollarSign, Eye, X, Send, Landmark, LogOut, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Menu, Activity, ShieldCheck,
  UserCheck, UserX, ArrowUpRight, Loader2, Filter, ChevronLeft,
  ChevronDown, Star, MoreVertical, Copy, Mail, Phone,
} from 'lucide-react';
import ECourtsSyncPanel from './_components/ECourtsSyncPanel';

/* ─── Types ─────────────────────────────────────────── */
interface Stats {
  totalUsers: number;
  subscribedUsers: number;
  freeUsers?: number;
  totalCalculations: number;
  totalSubscriptions?: number;
  newUsersThisMonth: number;
  userGrowth: string | number;
  revenueThisMonth: number;
  revenueGrowth: string | number;
  calculationsByType: { type: string; _count: { type: number } }[];
  recentSubscriptions: { id: string; user: { name: string; phone: string } | null; amount: string | number; createdAt: string }[];
  conversionRate: string | number;
}

interface User {
  id: string; name: string; phone: string; email?: string;
  role: string; isSubscribed: boolean; isActive: boolean;
  subscriptionExpiry?: string; createdAt: string;
}

interface Subscription {
  id: string;
  user: { name: string; phone: string; email?: string } | null;
  plan: string; amount: string | number;
  status: string; paymentId?: string; createdAt: string;
}

interface Calculation {
  id: string;
  user: { name: string; phone: string } | null;
  type: string; createdAt: string;
}

interface Case {
  id: string;
  user: { name: string; phone: string } | null;
  caseNo: string; caseYear: number; caseType: string;
  status: string; createdAt: string;
}

interface Notification {
  id: string;
  user?: { name: string; phone: string } | null;
  title: string; message?: string; type: string;
  isRead?: boolean; createdAt: string;
}

interface UserDetail {
  user: User;
  calculations: Calculation[];
  subscriptions: Subscription[];
  cases: Case[];
}

/* ─── Constants ─────────────────────────────────────── */
const BRAND = { primary: '#017c43', secondary: '#3dbfb7' };

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'revenue', label: 'Revenue', icon: CreditCard },
  { id: 'calculations', label: 'Calculations', icon: Calculator },
  { id: 'cases', label: 'Cases', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ecourts', label: 'eCourts Sync', icon: Landmark },
] as const;

type TabId = typeof TABS[number]['id'];

/* ─── Mini Spark Line ───────────────────────────────── */
function SparkLine({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Donut Chart ───────────────────────────────────── */
function DonutChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const r = 40, cx = 50, cy = 50, circum = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28">
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * circum;
        const gap = circum - dash;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={colors[i % colors.length]} strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circum}
            transform="rotate(-90 50 50)" />
        );
        offset += pct;
        return seg;
      })}
      <circle cx={cx} cy={cy} r={29} fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#111">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="#666">Total</text>
    </svg>
  );
}

/* ─── Bar Chart (simple SVG) ────────────────────────── */
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 240, h = 80, barW = w / data.length - 4;
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full h-28">
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        const x = i * (w / data.length) + 2;
        const y = h - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="3" fill={color} opacity="0.85" />
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" fontSize="6" fill="#999">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({ title, value, growth, icon: Icon, color, spark }: {
  title: string; value: string | number; growth?: number | string;
  icon: React.ElementType; color: string; spark?: number[];
}) {
  const g = Number(growth);
  const isPos = g >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {growth !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
              {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{isPos ? '+' : ''}{growth}% vs prev period</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
            <Icon size={20} style={{ color }} />
          </div>
          {spark && <SparkLine values={spark} color={color} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Badge ─────────────────────────────────────────── */
function Badge({ label, variant }: { label: string; variant: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }[variant];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
}

/* ─── Pagination ─────────────────────────────────────── */
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">Page {page} of {total}</p>
      <div className="flex gap-1">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(5, total) }, (_, i) => {
          const pg = page <= 3 ? i + 1 : page - 2 + i;
          if (pg < 1 || pg > total) return null;
          return (
            <button key={pg} onClick={() => onChange(pg)}
              className={`w-7 h-7 rounded-lg text-xs font-medium border transition-colors ${pg === page ? 'bg-primary text-white border-primary' : 'border-gray-200 hover:bg-gray-50'}`}
              style={pg === page ? { backgroundColor: BRAND.primary } : {}}>
              {pg}
            </button>
          );
        })}
        <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Toast ─────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const cls = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${cls} animate-slide-up`}>
      {type === 'success' ? <CheckCircle size={16} /> : type === 'error' ? <XCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AdminPanel() {
  const router = useRouter();

  // Auth
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Data
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subFilter, setSubFilter] = useState<'all' | 'premium' | 'free'>('all');

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', target: 'all' });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
  }, []);

  /* ── Auth check (server-side) ──────────────────── */
  useEffect(() => {
    async function verifyAdmin() {
      try {
        const res = await fetch('/api/admin/users?type=stats', { 
          credentials: 'include' 
        });
        
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        
        if (res.status === 403) {
          showToast('Unauthorized: Admin access required', 'error');
          setTimeout(() => router.push('/dashboard'), 2000);
          setAuthChecking(false);
          return;
        }
        
        if (!res.ok) {
          router.push('/login');
          return;
        }
        
        setIsAdmin(true);
      } catch {
        router.push('/login');
      }
      setAuthChecking(false);
    }
    
    verifyAdmin();
  }, [router, showToast]);

  /* ── Fetch data ─────────────────────────────────── */
  const fetchData = useCallback(async (currentPage = page) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const url = `/api/admin/users?type=${activeTab === 'revenue' ? 'subscriptions' : activeTab === 'dashboard' ? 'stats' : activeTab}&page=${currentPage}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to fetch data', 'error');
        setLoading(false);
        return;
      }

      if (activeTab === 'dashboard') setStats(data.data);
      else if (activeTab === 'users') { setUsers(data.data); setTotalPages(data.totalPages ?? 1); setTotalItems(data.total ?? 0); }
      else if (activeTab === 'revenue') { setSubscriptions(data.data); setTotalPages(data.totalPages ?? 1); setTotalItems(data.total ?? 0); }
      else if (activeTab === 'calculations') { setCalculations(data.data); setTotalPages(data.totalPages ?? 1); setTotalItems(data.total ?? 0); }
      else if (activeTab === 'cases') { setCases(data.data); setTotalPages(data.totalPages ?? 1); setTotalItems(data.total ?? 0); }
      else if (activeTab === 'notifications') { setNotifications(data.data); setTotalPages(data.totalPages ?? 1); setTotalItems(data.total ?? 0); }
    } catch (err) {
      showToast('Network error. Please retry.', 'error');
      console.error(err);
    }
    setLoading(false);
  }, [isAdmin, activeTab, page, showToast]);

  useEffect(() => {
    if (isAdmin) fetchData(page);
  }, [isAdmin, activeTab, page]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setPage(1);
    setSearchTerm('');
    setSidebarOpen(false);
  };

  /* ── User detail ─────────────────────────────────── */
  const fetchUserDetail = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users?type=user-detail&userId=${userId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) { setSelectedUser(data.data); setShowUserModal(true); }
      else showToast('Failed to load user details', 'error');
    } catch { showToast('Failed to load user detail', 'error'); }
  };

  /* ── User action ─────────────────────────────────── */
  const handleAction = async (userId: string, action: string) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) { showToast('Action applied successfully', 'success'); fetchData(page); }
      else showToast(data.message || 'Action failed', 'error');
    } catch { showToast('Action failed', 'error'); }
    setActionLoadingId(null);
  };

  /* ── Broadcast ───────────────────────────────────── */
  const handleBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      showToast('Title and message are required', 'error'); return;
    }
    setBroadcastLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast', title: broadcastForm.title, message: broadcastForm.message }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Notification sent to ${data.data.count} users`, 'success');
        setShowBroadcast(false);
        setBroadcastForm({ title: '', message: '', target: 'all' });
      } else showToast(data.message || 'Broadcast failed', 'error');
    } catch { showToast('Broadcast failed', 'error'); }
    setBroadcastLoading(false);
  };

  /* ── CSV Export ──────────────────────────────────── */
  const exportToCSV = (dataArr: Record<string, unknown>[], filename: string) => {
    if (!dataArr.length) { showToast('No data to export', 'info'); return; }
    const headers = Object.keys(dataArr[0]).filter(k => !['rawData', 'inputData', 'resultData'].includes(k));
    const csv = [headers.join(','), ...dataArr.map(row =>
      headers.map(h => {
        const val = (row as Record<string, unknown>)[h];
        return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
      }).join(',')
    )].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
    showToast(`Exported ${filename}.csv`, 'success');
  };

  /* ── Derived ─────────────────────────────────────── */
  const filteredUsers = users.filter(u => {
    const matchSearch = !searchTerm || u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSub = subFilter === 'all' || (subFilter === 'premium' ? u.isSubscribed : !u.isSubscribed);
    return matchSearch && matchSub;
  });

  /* ════════════════════════════════════════ RENDER ══ */
  if (authChecking) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={36} className="animate-spin" style={{ color: BRAND.primary }} />
        <p className="text-gray-500 text-sm">Verifying access…</p>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm mb-4">You don't have admin privileges.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: BRAND.primary }}>
          <ChevronLeft size={16} /> Return to App
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar Overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3c 100%)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Image src="/logo.png" alt="Ruswaps" width={36} height={36} className="w-9 h-9 object-contain" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide">RUSWAPS</p>
            <p className="text-xs font-medium" style={{ color: BRAND.secondary }}>Admin Console</p>
          </div>
          <button className="ml-auto lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/8'
                }`}
                style={active ? { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` } : {}}>
                <tab.icon size={17} />
                {tab.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={() => handleBroadcast && setShowBroadcast(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-all">
            <Send size={15} /> Broadcast Notification
          </button>
          <Link href="/dashboard"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-all">
            <LogOut size={15} /> Back to App
          </Link>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight capitalize">{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'revenue' ? 'Revenue' : activeTab}</h1>
            <p className="text-xs text-gray-400">Admin Management System</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => fetchData(page)} disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Refresh">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowBroadcast(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}>
              <Bell size={15} /> Broadcast
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {loading && !stats && !users.length ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={36} className="animate-spin" style={{ color: BRAND.primary }} />
            </div>
          ) : (
            <>
              {/* ─── DASHBOARD TAB ─────────────────── */}
              {activeTab === 'dashboard' && stats && (
                <div className="space-y-6">
                  {/* KPI Row */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()}
                      growth={stats.userGrowth} icon={Users} color={BRAND.primary}
                      spark={[60, 72, 65, 80, 75, 90, 85, 95, 88, 100]} />
                    <StatCard title="Revenue (30d)" value={`₹${(stats.revenueThisMonth ?? 0).toLocaleString()}`}
                      growth={stats.revenueGrowth} icon={DollarSign} color="#10b981"
                      spark={[30, 45, 35, 60, 55, 70, 65, 80, 75, 90]} />
                    <StatCard title="Subscribers" value={stats.subscribedUsers.toLocaleString()}
                      icon={Star} color="#f59e0b"
                      spark={[10, 15, 12, 20, 18, 25, 22, 30, 28, 35]} />
                    <StatCard title="Calculations" value={(stats.totalCalculations ?? 0).toLocaleString()}
                      icon={Calculator} color={BRAND.secondary}
                      spark={[20, 30, 25, 40, 35, 50, 45, 60, 55, 70]} />
                  </div>

                  {/* Secondary KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: Activity, color: '#8b5cf6' },
                      { label: 'New Users (30d)', value: stats.newUsersThisMonth, icon: UserCheck, color: '#06b6d4' },
                      { label: 'Prev Revenue', value: `₹${(stats.revenueThisMonth ?? 0).toLocaleString()}`, icon: ArrowUpRight, color: '#f43f5e' },
                    ].map(k => (
                      <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 shadow-sm">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${k.color}18` }}>
                          <k.icon size={20} style={{ color: k.color }} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                          <p className="text-xl font-bold text-gray-900">{k.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Charts Row */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Calculations by Type */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Calculations by Type</h3>
                        <span className="text-xs text-gray-400">{stats.totalCalculations} total</span>
                      </div>
                      {stats.calculationsByType?.length ? (
                        <div className="flex items-center gap-6">
                          <DonutChart
                            data={stats.calculationsByType.map(c => ({ label: c.type, value: c._count.type }))}
                            colors={[BRAND.primary, BRAND.secondary, '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4']}
                          />
                          <div className="flex-1 space-y-2">
                            {stats.calculationsByType.map((c, i) => {
                              const colors = [BRAND.primary, BRAND.secondary, '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];
                              const pct = stats.totalCalculations ? ((c._count.type / stats.totalCalculations) * 100).toFixed(0) : 0;
                              return (
                                <div key={c.type}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600 uppercase font-medium">{c.type}</span>
                                    <span className="text-gray-900 font-semibold">{c._count.type} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                                  </div>
                                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : <p className="text-sm text-gray-400">No data yet</p>}
                    </div>

                    {/* Recent Subscriptions */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Recent Subscriptions</h3>
                        <button onClick={() => handleTabChange('revenue')} className="text-xs font-medium hover:underline" style={{ color: BRAND.primary }}>
                          View all →
                        </button>
                      </div>
                      <div className="space-y-2">
                        {stats.recentSubscriptions?.length ? stats.recentSubscriptions.map(sub => (
                          <div key={sub.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}>
                              {sub.user?.name?.[0] ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{sub.user?.name ?? 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{sub.user?.phone}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-600">₹{sub.amount}</p>
                              <p className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleDateString('en-IN')}</p>
                            </div>
                          </div>
                        )) : <p className="text-sm text-gray-400">No subscriptions yet</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── USERS TAB ─────────────────────── */}
              {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Toolbar */}
                  <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input type="text" placeholder="Search name, phone, email…"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': BRAND.primary } as React.CSSProperties} />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {(['all', 'premium', 'free'] as const).map(f => (
                        <button key={f} onClick={() => setSubFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${subFilter === f ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          style={subFilter === f ? { backgroundColor: BRAND.primary } : {}}>
                          {f}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => exportToCSV(filteredUsers as unknown as Record<string, unknown>[], 'users')}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <Download size={14} /> Export CSV
                    </button>
                  </div>

                  <div className="text-xs text-gray-400 px-4 py-2 bg-gray-50 border-b border-gray-100">
                    Showing {filteredUsers.length} of {totalItems} users
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          {['User', 'Phone', 'Status', 'Account', 'Joined', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}>
                                  {user.name?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                  <p className="text-xs text-gray-400">{user.email || 'No email'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{user.phone}</td>
                            <td className="px-4 py-3">
                              <Badge label={user.isSubscribed ? 'Premium' : 'Free'}
                                variant={user.isSubscribed ? 'green' : 'gray'} />
                            </td>
                            <td className="px-4 py-3">
                              <Badge label={user.isActive ? 'Active' : 'Inactive'}
                                variant={user.isActive ? 'blue' : 'red'} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => fetchUserDetail(user.id)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="View Details">
                                  <Eye size={15} />
                                </button>
                                <button
                                  onClick={() => handleAction(user.id, user.isSubscribed ? 'unsubscribe' : 'subscribe')}
                                  disabled={actionLoadingId === user.id}
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                  title={user.isSubscribed ? 'Unsubscribe' : 'Grant Premium'}>
                                  {actionLoadingId === user.id ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredUsers.length && (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">
                              {searchTerm ? 'No users match your search.' : 'No users found.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} total={totalPages} onChange={p => { setPage(p); fetchData(p); }} />
                </div>
              )}

              {/* ─── REVENUE TAB ───────────────────── */}
              {activeTab === 'revenue' && (
                <div className="space-y-4">
                  {/* Revenue summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Total Transactions', value: totalItems, icon: CreditCard, color: BRAND.primary },
                      {
                        label: 'Completed Rev.', color: '#10b981', icon: DollarSign,
                        value: `₹${subscriptions.filter(s => s.status === 'completed').reduce((a, s) => a + Number(s.amount), 0).toLocaleString()}`,
                      },
                      { label: 'Pending / Failed', color: '#f59e0b', icon: AlertCircle,
                        value: subscriptions.filter(s => s.status !== 'completed').length },
                    ].map(k => (
                      <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${k.color}18` }}>
                          <k.icon size={20} style={{ color: k.color }} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                          <p className="text-xl font-bold text-gray-900">{k.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Transaction History</h3>
                      <button onClick={() => exportToCSV(subscriptions.map(s => ({
                        user: s.user?.name, phone: s.user?.phone, plan: s.plan, amount: s.amount, status: s.status, date: s.createdAt
                      })), 'revenue')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                        <Download size={14} /> Export
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            {['User', 'Plan', 'Amount', 'Status', 'Date'].map(h => (
                              <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {subscriptions.map(sub => (
                            <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-gray-900">{sub.user?.name ?? '—'}</p>
                                <p className="text-xs text-gray-400">{sub.user?.phone}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 capitalize">{sub.plan}</td>
                              <td className="px-4 py-3 text-sm font-bold text-emerald-600">₹{sub.amount}</td>
                              <td className="px-4 py-3">
                                <Badge label={sub.status}
                                  variant={sub.status === 'completed' ? 'green' : sub.status === 'failed' ? 'red' : 'yellow'} />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(sub.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                          {!subscriptions.length && (
                            <tr><td colSpan={5} className="py-16 text-center text-sm text-gray-400">No transactions found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Pagination page={page} total={totalPages} onChange={p => { setPage(p); fetchData(p); }} />
                  </div>
                </div>
              )}

              {/* ─── CALCULATIONS TAB ──────────────── */}
              {activeTab === 'calculations' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Calculator Usage <span className="text-gray-400 font-normal text-sm">({totalItems} total)</span></h3>
                    <button onClick={() => exportToCSV(calculations.map(c => ({
                      user: c.user?.name, phone: c.user?.phone, type: c.type, date: c.createdAt
                    })), 'calculations')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <Download size={14} /> Export
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          {['User', 'Calculator Type', 'Date'].map(h => (
                            <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {calculations.map(calc => (
                          <tr key={calc.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{calc.user?.name ?? '—'}</p>
                              <p className="text-xs text-gray-400">{calc.user?.phone}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge label={calc.type.toUpperCase()} variant="blue" />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(calc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                        {!calculations.length && (
                          <tr><td colSpan={3} className="py-16 text-center text-sm text-gray-400">No calculations found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} total={totalPages} onChange={p => { setPage(p); fetchData(p); }} />
                </div>
              )}

              {/* ─── CASES TAB ─────────────────────── */}
              {activeTab === 'cases' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Tracked Cases <span className="text-gray-400 font-normal text-sm">({totalItems} total)</span></h3>
                    <button onClick={() => exportToCSV(cases as unknown as Record<string, unknown>[], 'cases')}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <Download size={14} /> Export
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          {['Case No.', 'User', 'Type', 'Status', 'Date'].map(h => (
                            <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cases.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{c.caseNo}/{c.caseYear}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{c.user?.name ?? '—'}</p>
                              <p className="text-xs text-gray-400">{c.user?.phone}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{c.caseType}</td>
                            <td className="px-4 py-3">
                              <Badge label={c.status}
                                variant={c.status === 'pending' ? 'yellow' : c.status === 'resolved' ? 'green' : 'blue'} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                        {!cases.length && (
                          <tr><td colSpan={5} className="py-16 text-center text-sm text-gray-400">No cases found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} total={totalPages} onChange={p => { setPage(p); fetchData(p); }} />
                </div>
              )}

              {/* ─── NOTIFICATIONS TAB ─────────────── */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button onClick={() => setShowBroadcast(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}>
                      <Send size={15} /> New Broadcast
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Notification History <span className="text-gray-400 font-normal text-sm">({totalItems} sent)</span></h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px]">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            {['Recipient', 'Title', 'Type', 'Sent'].map(h => (
                              <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {notifications.map(n => (
                            <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{n.user?.name || 'All Users'}</td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-gray-900 font-medium">{n.title}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[200px]">{n.message}</p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge label={n.type} variant={n.type === 'broadcast' ? 'blue' : 'gray'} />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                          {!notifications.length && (
                            <tr><td colSpan={4} className="py-16 text-center text-sm text-gray-400">No notifications sent yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Pagination page={page} total={totalPages} onChange={p => { setPage(p); fetchData(p); }} />
                  </div>
                </div>
              )}

              {/* ─── ECOURTS TAB ───────────────────── */}
              {activeTab === 'ecourts' && <ECourtsSyncPanel />}
            </>
          )}
        </main>
      </div>

      {/* ═══ USER DETAIL MODAL ═══════════════════════════ */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUserModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}>
                {selectedUser.user.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900">{selectedUser.user.name}</h2>
                <p className="text-sm text-gray-400">{selectedUser.user.phone} • {selectedUser.user.email || 'No email'}</p>
              </div>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Subscription', value: <Badge label={selectedUser.user.isSubscribed ? 'Premium' : 'Free'} variant={selectedUser.user.isSubscribed ? 'green' : 'gray'} /> },
                  { label: 'Account', value: <Badge label={selectedUser.user.isActive ? 'Active' : 'Inactive'} variant={selectedUser.user.isActive ? 'blue' : 'red'} /> },
                  { label: 'Role', value: <Badge label={selectedUser.user.role} variant={selectedUser.user.role === 'ADMIN' ? 'yellow' : 'gray'} /> },
                  { label: 'Joined', value: new Date(selectedUser.user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                  { label: 'Expires', value: selectedUser.user.subscriptionExpiry ? new Date(selectedUser.user.subscriptionExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  { label: 'Calculations', value: selectedUser.calculations.length },
                ].map(info => (
                  <div key={info.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">{info.label}</p>
                    <div className="text-sm font-semibold text-gray-900">{info.value}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { handleAction(selectedUser.user.id, selectedUser.user.isSubscribed ? 'unsubscribe' : 'subscribe'); setShowUserModal(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-white"
                  style={{ backgroundColor: BRAND.primary }}>
                  <CreditCard size={13} /> {selectedUser.user.isSubscribed ? 'Revoke Premium' : 'Grant Premium'}
                </button>
              </div>

              {/* Subscriptions */}
              {selectedUser.subscriptions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Subscription History</h3>
                  <div className="space-y-2">
                    {selectedUser.subscriptions.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Badge label={s.plan} variant="blue" />
                          <Badge label={s.status} variant={s.status === 'completed' ? 'green' : 'yellow'} />
                        </div>
                        <span className="text-sm font-bold text-emerald-600">₹{s.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculations */}
              {selectedUser.calculations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Calculations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedUser.calculations.slice(0, 6).map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                        <Badge label={c.type.toUpperCase()} variant="blue" />
                        <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cases */}
              {selectedUser.cases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Tracked Cases ({selectedUser.cases.length})</h3>
                  <div className="space-y-2">
                    {selectedUser.cases.slice(0, 4).map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                        <span className="text-sm font-mono font-medium text-gray-900">{c.caseNo}/{c.caseYear}</span>
                        <Badge label={c.status} variant={c.status === 'pending' ? 'yellow' : 'green'} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ BROADCAST MODAL ═════════════════════════════ */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowBroadcast(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${BRAND.primary}18` }}>
                  <Send size={18} style={{ color: BRAND.primary }} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Broadcast Notification</h2>
              </div>
              <button onClick={() => setShowBroadcast(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Title *</label>
                <input type="text" value={broadcastForm.title}
                  onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': BRAND.primary } as React.CSSProperties}
                  placeholder="e.g., New Feature Available!" maxLength={100} />
                <p className="text-xs text-gray-400 mt-1">{broadcastForm.title.length}/100</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Message *</label>
                <textarea value={broadcastForm.message}
                  onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ '--tw-ring-color': BRAND.primary } as React.CSSProperties}
                  rows={4} placeholder="Enter your message…" maxLength={500} />
                <p className="text-xs text-gray-400 mt-1">{broadcastForm.message.length}/500</p>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">This will send a push notification to <strong>all registered users</strong>. Please confirm the content before sending.</p>
              </div>
              <button onClick={handleBroadcast} disabled={broadcastLoading || !broadcastForm.title || !broadcastForm.message}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` }}>
                {broadcastLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {broadcastLoading ? 'Sending…' : 'Send to All Users'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .bg-primary { background-color: #017c43; }
        .text-primary { color: #017c43; }
        .border-primary { border-color: #017c43; }
        :focus-visible { outline: 2px solid #017c43; outline-offset: 2px; }
        input:focus, textarea:focus { --tw-ring-color: #017c43 !important; }
      `}</style>
    </div>
  );
}
