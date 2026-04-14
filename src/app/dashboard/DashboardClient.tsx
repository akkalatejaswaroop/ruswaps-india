"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Truck,
  Briefcase,
  Scale,
  CreditCard,
  Calendar,
  AlertTriangle,
  FileText,
  BookOpen,
  Shield,
  Users,
  Download,
  Bell,
  LogOut,
  Menu,
  ChevronRight,
  Search,
  Filter,
  X,
  Clock,
  TrendingUp,
  FileText as FileTextIcon,
  Trash2,
  Gavel,
  Zap,
  ArrowUpRight,
  ChevronDown,
  Command,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CalculationCardSkeleton } from '@/lib/ui';
import { PremiumCard, PremiumBadge } from '@/components/ui/PremiumCard';
import { RevenueTracker } from '@/components/ui/RevenueTracker';
import { CommandPalette } from '@/components/ui/CommandPalette';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

interface RecentCalculation {
  id: string;
  type: string;
  resultData: Record<string, unknown>;
  createdAt: Date | string;
}

interface WatchedCase {
  id: string;
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  status: string;
  nextHearingDate: Date | string | null;
  changedAt: Date | string;
  petitioner: string;
  respondent: string;
  court: string;
}

interface DashboardClientProps {
  user: {
    name: string;
    isSubscribed: boolean;
    subscriptionExpiry: Date | string | null;
  };
  recentCalculations: RecentCalculation[];
  calculationCount: number;
  unreadCount: number;
  watchedCases: WatchedCase[];
}

const features = [
  { name: 'Motor Vehicle Accident Claims', icon: Truck, href: '/calculators/mva-claims', color: 'primary' },
  { name: 'Employee Compensation', icon: Briefcase, href: '/calculators/employee-compensation', color: 'secondary' },
  { name: 'Disability Calculator', icon: Scale, href: '/calculators/disability', color: 'primary' },
  { name: 'Income Tax on Interest', icon: CreditCard, href: '/calculators/income-tax', color: 'secondary' },
  { name: 'Age Calculator', icon: Calendar, href: '/calculators/age', color: 'primary' },
  { name: 'Hit & Run Cases', icon: AlertTriangle, href: '/calculators/hit-run', color: 'secondary' },
];

const documents = [
  { name: 'Vakalatnama', icon: FileText, href: '/documents/vakalatnama' },
  { name: 'Legal Dictionary', icon: BookOpen, href: '/documents/dictionary' },
  { name: 'Provisions in Accident Claims', icon: Shield, href: '/documents/provisions' },
  { name: 'Motor Vehicle Act', icon: Users, href: '/documents/mv-act' },
  { name: 'Employee Compensation Act', icon: Briefcase, href: '/documents/ec-act' },
  { name: 'WS Documents', icon: Download, href: '/documents/ws' },
];

const calculationTypes: Record<string, { label: string; icon: typeof Calculator; color: string }> = {
  mva: { label: 'MVA Claims', icon: Truck, color: 'bg-blue-100 text-blue-600' },
  ec: { label: 'Employee Comp', icon: Briefcase, color: 'bg-purple-100 text-purple-600' },
  disability: { label: 'Disability', icon: Scale, color: 'bg-green-100 text-green-600' },
  'income-tax': { label: 'Income Tax', icon: CreditCard, color: 'bg-yellow-100 text-yellow-600' },
  'hit-run': { label: 'Hit & Run', icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
};

function formatCurrency(amount: number): string {
  return `Rs.${amount.toLocaleString('en-IN')}`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDaysUntilHearing(date: Date | string | null): string {
  if (!date) return 'N/A';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hearing = typeof date === 'string' ? new Date(date) : date;
  hearing.setHours(0, 0, 0, 0);
  const diff = Math.ceil((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Past';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days`;
}

export default function DashboardClient({
  user,
  recentCalculations,
  calculationCount,
  unreadCount: initialUnreadCount,
  watchedCases: initialWatchedCases,
}: DashboardClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [calculations, setCalculations] = useState<RecentCalculation[]>(recentCalculations);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(calculationCount);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string; title: string; message: string; createdAt: string | Date}>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount] = useState(initialUnreadCount);
  const [watchedCases] = useState(initialWatchedCases);

  useEffect(() => {
    setCalculations(recentCalculations);
    setTotalCount(calculationCount);
  }, [recentCalculations, calculationCount]);

  const fetchCalculations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        params.set('startDate', startDate.toISOString());
      }

      const res = await fetch(`/api/calculations?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setCalculations(data.data || []);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch calculations:', err);
    }
    setIsLoading(false);
  }, [searchQuery, typeFilter, dateFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCalculations();
    }, 300);

    return () => clearTimeout(debounce);
  }, [fetchCalculations]);

  const getTotalAmount = (resultData: Record<string, unknown>): number => {
    return (resultData.totalWithInterest || resultData.totalCompensation || resultData.totalCompensation || 0) as number;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || dateFilter !== 'all';

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    }
    setLoadingNotifications(false);
  };

  const handleLogout = async () => {
    if (!logoutConfirm) return;
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/');
  };

  const openLogoutModal = () => {
    setLogoutConfirm(false);
    setShowLogoutModal(true);
  };

  const deleteCalculation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calculation?')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/calculations?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        setCalculations(prev => prev.filter(c => c.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete calculation:', err);
    }
    setDeletingId(null);
  };

  const downloadPDF = (id: string) => {
    window.open(`/api/calculations/pdf?id=${id}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CommandPalette />
      
      <nav className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:text-primary lg:hidden transition-colors">
                <Menu size={24} />
              </button>
              <Link href="/dashboard" className="flex items-center gap-2 ml-2 lg:ml-0 group transition-transform hover:scale-105">
                <Image src="/main_logo.jpg" alt="Ruswaps" width={140} height={40} className="h-10 w-auto object-contain" />
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 rounded-full text-xs text-gray-500 border border-gray-200 dark:border-slate-700 cursor-help" title="Press Ctrl+K to search">
                <Command size={14} />
                <span>K / Search</span>
              </div>

              <div className="relative">
                <button 
                  onClick={() => { fetchNotifications(); setShowNotifications(!showNotifications); }} 
                  className={cn(
                    "p-2.5 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative",
                    unreadCount > 0 && "after:content-[''] after:absolute after:top-2 after:right-2 after:w-2.5 after:h-2.5 after:bg-red-500 after:rounded-full after:border-2 after:border-white"
                  )}
                >
                  <Bell size={24} />
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-14 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                        <X size={16} className="text-gray-400" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-2" />
                          <p className="text-sm">Fetching...</p>
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div key={notif.id} className="p-4 border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                            <p className="font-bold text-sm text-gray-900 dark:text-white">{notif.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-gray-400 mt-2 block italic">{formatDate(notif.createdAt)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="text-gray-300" size={32} />
                          </div>
                          <p className="text-gray-500 text-sm font-medium">Clear as a sky!</p>
                          <p className="text-xs text-gray-400 mt-1">Check back later for updates</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!user.isSubscribed ? (
                <Link href="/subscription" className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95">
                  <Zap size={16} />
                  Go Pro
                </Link>
              ) : (
                <PremiumBadge className="px-3 py-1 bg-amber-100 text-amber-700 border-amber-200">
                  <Shield size={12} className="mr-1" />
                  Premium Member
                </PremiumBadge>
              )}

              <button onClick={openLogoutModal} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}!</h1>
          <p className="text-gray-600">Access all legal calculators and documents</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <PremiumCard className="bg-primary text-white border-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Total Calculations</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black">{totalCount}</p>
                  <p className="text-xs text-white/60">processed</p>
                </div>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center">
                <Calculator size={32} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-white/70">
              <TrendingUp size={14} />
              <span>+12% from last month</span>
            </div>
          </PremiumCard>
          
          <PremiumCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Active Features</p>
                <p className="text-4xl font-black mt-1 text-gray-900">{features.length}</p>
              </div>
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                <Zap size={32} className="text-green-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-green-600 font-medium">
              <span>All systems operational</span>
            </div>
          </PremiumCard>

          <PremiumCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Documents</p>
                <p className="text-4xl font-black mt-1 text-gray-900">{documents.length}</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <FileTextIcon size={32} className="text-blue-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
               <span className="text-xs text-gray-500">Legal forms available</span>
               <ArrowUpRight size={14} className="text-gray-300" />
            </div>
          </PremiumCard>
        </div>

        <div className="mb-12">
          {user.isSubscribed ? (
            <RevenueTracker />
          ) : (
            <PremiumCard className="bg-slate-900 border-none relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-50" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-4">
                <div className="max-w-xl">
                  <h2 className="text-2xl font-black text-white mb-2">Unlock Revenue & Fee Tracker</h2>
                  <p className="text-slate-400 leading-relaxed">
                    Track your legal fees, case settlements, and commissions professionally. 
                    Get detailed charts and financial insights for your legal practice.
                  </p>
                  <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"/> Fee Management</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-secondary rounded-full"/> Settlement Tracking</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"/> Financial Reports</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-secondary rounded-full"/> Export to PDF</li>
                  </ul>
                </div>
                <Link href="/subscription" className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black hover:bg-primary hover:text-white transition-all shadow-2xl active:scale-95 text-center">
                  Unlock Premium Features
                </Link>
              </div>
            </PremiumCard>
          )}
        </div>

        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Recent Calculations</h2>
              <p className="text-sm text-gray-500">Manage your previously processed legal claims</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none w-full sm:w-64 shadow-sm transition-all"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50 shadow-sm'}`}
              >
                <Filter size={20} />
              </button>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="bg-gray-100/50 rounded-2xl p-5 border border-white mb-6 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap gap-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(calculationTypes).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Timeframe</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today Only</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <CalculationCardSkeleton key={i} />
              ))}
            </div>
          ) : calculations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {calculations.map((calc) => {
                const typeInfo = calculationTypes[calc.type] || { label: calc.type, icon: Calculator, color: 'bg-gray-100 text-gray-600' };
                const IconComponent = typeInfo.icon;
                const total = getTotalAmount(calc.resultData);

                return (
                  <PremiumCard key={calc.id} className="group relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${typeInfo.color.split(' ')[0]} bg-opacity-10 ${typeInfo.color.split(' ')[1]}`}>
                        <IconComponent size={24} />
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => downloadPDF(calc.id)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => deleteCalculation(calc.id)}
                          disabled={deletingId === calc.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete"
                        >
                          {deletingId === calc.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{typeInfo.label}</h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(calc.createdAt)}
                    </p>

                    <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Calculated Amount</p>
                        <p className="text-lg font-black text-slate-800">{formatCurrency(total)}</p>
                      </div>
                      <Link 
                        href={`/calculators/${calc.type === 'mva' ? 'mva-claims' : calc.type}?id=${calc.id}`}
                        className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-primary hover:text-white transition-all"
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </div>
                  </PremiumCard>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-16 border border-gray-100 text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calculator size={40} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to crunch some numbers?</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">Start a new calculation to see your history and generated reports right here.</p>
              <Link href="/calculators/mva-claims" className="inline-flex items-center gap-3 px-8 py-3.5 bg-primary text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95">
                <Calculator size={20} />
                Try MVA Calculator
              </Link>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Hearings</h2>
          {watchedCases.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hearing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {watchedCases.map((watched) => (
                    <tr key={watched.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 text-sm">{watched.caseNumber}</p>
                        <p className="text-xs text-gray-500">{watched.cnrNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{watched.court}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getDaysUntilHearing(watched.nextHearingDate) === 'Today' || getDaysUntilHearing(watched.nextHearingDate) === 'Tomorrow'
                            ? 'bg-red-100 text-red-700'
                            : getDaysUntilHearing(watched.nextHearingDate) === 'Past'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {getDaysUntilHearing(watched.nextHearingDate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
              <Gavel size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Watch cases to see hearings here</p>
              <Link href="/courts" className="text-primary text-sm hover:underline">Search eCourts</Link>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Calculators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Link key={feature.name} href={feature.href} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition card-hover">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  feature.color === 'primary' ? 'bg-primary/10' : 'bg-secondary/10'
                }`}>
                  <feature.icon className={feature.color === 'primary' ? 'text-primary' : 'text-secondary'} size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">{feature.name}</h3>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Legal Documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Link key={doc.name} href={doc.href} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition card-hover">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  <doc.icon className="text-gray-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">{doc.name}</h3>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/case-directory" className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Case Directory</h3>
                  <p className="text-gray-500 text-sm">Track and manage your cases</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" />
            </Link>
            <Link href="/courts" className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition flex items-center justify-between relative">
              {unreadCount > 0 && (
                <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                  {unreadCount}
                </span>
              )}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Gavel className="text-amber-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">eCourts Cases</h3>
                  <p className="text-gray-500 text-sm">Search court records</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Logout</h3>
              <p className="text-gray-500">Are you sure you want to logout from your account?</p>
            </div>
            
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={logoutConfirm}
                onChange={(e) => setLogoutConfirm(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">I confirm that I want to logout</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowLogoutModal(false); setLogoutConfirm(false); }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={!logoutConfirm}
                className={`flex-1 py-3 rounded-xl font-medium transition ${
                  logoutConfirm
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
