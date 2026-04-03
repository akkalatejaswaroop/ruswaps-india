"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calculator,
  CreditCard,
  BarChart3,
  Bell,
  Search,
  RefreshCw,
  Download,
  Settings,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  X,
  Send
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [calculations, setCalculations] = useState([]);
  const [cases, setCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN') {
        setError('Unauthorized: Admin access required');
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      fetchData();
    } catch {
      setError('Invalid token');
      setLoading(false);
    }
  }, [activeTab, page]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `${API_URL}/api/admin/users?type=${activeTab}&page=${page}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to fetch data');
        setLoading(false);
        return;
      }
      
      if (data.success) {
        if (activeTab === 'stats') setStats(data.data);
        else if (activeTab === 'users') { setUsers(data.data); setTotalPages(data.totalPages); }
        else if (activeTab === 'subscriptions') { setSubscriptions(data.data); setTotalPages(data.totalPages); }
        else if (activeTab === 'calculations') { setCalculations(data.data); setTotalPages(data.totalPages); }
        else if (activeTab === 'cases') { setCases(data.data); setTotalPages(data.totalPages); }
        else if (activeTab === 'notifications') { setNotifications(data.data); setTotalPages(data.totalPages); }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to fetch data');
    }
    setLoading(false);
  };

  const fetchUserDetail = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users?type=user-detail&userId=${userId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setSelectedUser(data.data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const handleAction = async (userId, action) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/actions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handleBroadcast = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast', ...broadcastForm }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setShowBroadcast(false);
        setBroadcastForm({ title: '', message: '' });
        alert(`Notification sent to ${data.data.count} users`);
      }
    } catch (err) {
      console.error('Broadcast failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">{error || 'You do not have admin access'}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  const exportToCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => !k.includes('At') || k === 'createdAt');
    const csv = [headers.join(','), ...data.map(row => headers.map(h => {
      const val = row[h];
      return typeof val === 'object' ? JSON.stringify(val) : val ?? '';
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Revenue', icon: CreditCard },
    { id: 'calculations', label: 'Calculations', icon: Calculator },
    { id: 'cases', label: 'Cases', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image src="/logo.png" alt="Ruswaps" width={40} height={40} className="w-10 h-10 object-contain" />
                <Image src="/main_logo.jpg" alt="Ruswaps" width={36} height={36} className="hidden lg:block h-9 object-contain" />
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBroadcast(true)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
                <Bell size={16} /> Broadcast
              </button>
              <button onClick={fetchData} className="p-2 text-gray-600 hover:text-primary">
                <RefreshCw size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'stats' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                        <p className={`text-xs flex items-center gap-1 ${Number(stats.userGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(stats.userGrowth) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stats.userGrowth}% this month
                        </p>
                      </div>
                      <Users className="text-primary" size={28} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Revenue (30 days)</p>
                        <p className="text-2xl font-bold text-green-600">₹{stats.revenueThisMonth?.toLocaleString()}</p>
                        <p className={`text-xs flex items-center gap-1 ${Number(stats.revenueGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(stats.revenueGrowth) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {stats.revenueGrowth}%
                        </p>
                      </div>
                      <DollarSign className="text-green-600" size={28} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Subscribed Users</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.subscribedUsers}</p>
                        <p className="text-xs text-gray-500">{stats.conversionRate}% conversion</p>
                      </div>
                      <CreditCard className="text-secondary" size={28} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Calculations</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalCalculations}</p>
                      </div>
                      <Calculator className="text-primary" size={28} />
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">Calculations by Type</h3>
                    <div className="space-y-3">
                      {stats.calculationsByType?.map(c => (
                        <div key={c.type} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 uppercase">{c.type}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(c._count.type / stats.totalCalculations) * 100}%` }}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{c._count.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">Recent Subscriptions</h3>
                    <div className="space-y-3">
                      {stats.recentSubscriptions?.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sub.user?.name}</p>
                            <p className="text-xs text-gray-500">{sub.user?.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">₹{sub.amount}</p>
                            <p className="text-xs text-gray-500">{new Date(sub.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button onClick={() => exportToCSV(filteredUsers, 'users')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2">
                    <Download size={16} /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Phone</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Joined</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{user.phone}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.isSubscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {user.isSubscribed ? 'Premium' : 'Free'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => { fetchUserDetail(user.id); setShowModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                                <Eye size={18} />
                              </button>
                              <button onClick={() => handleAction(user.id, user.isSubscribed ? 'unsubscribe' : 'subscribe')} className="p-1 text-primary hover:bg-primary/10 rounded" title={user.isSubscribed ? 'Unsubscribe' : 'Subscribe'}>
                                {user.isSubscribed ? <CreditCard size={18} /> : <CreditCard size={18} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-100 flex justify-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                    <span className="px-3 py-1">{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-end">
                  <button onClick={() => exportToCSV(subscriptions.map(s => ({ user: s.user?.name, phone: s.user?.phone, plan: s.plan, amount: s.amount, status: s.status, date: s.createdAt })), 'subscriptions')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2">
                    <Download size={16} /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Plan</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subscriptions.map(sub => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{sub.user?.name}</p>
                            <p className="text-xs text-gray-500">{sub.user?.phone}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">{sub.plan}</td>
                          <td className="px-4 py-3 text-sm font-medium text-green-600">₹{sub.amount}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sub.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(sub.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'calculations' && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-end">
                  <button onClick={() => exportToCSV(calculations.map(c => ({ user: c.user?.name, phone: c.user?.phone, type: c.type, date: c.createdAt })), 'calculations')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2">
                    <Download size={16} /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {calculations.map(calc => (
                        <tr key={calc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{calc.user?.name}</p>
                            <p className="text-xs text-gray-500">{calc.user?.phone}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 uppercase">{calc.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(calc.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'cases' && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Case No</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cases.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{c.caseNo}/{c.caseYear}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{c.user?.name}</p>
                            <p className="text-xs text-gray-500">{c.user?.phone}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{c.caseType}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {notifications.map(n => (
                        <tr key={n.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{n.user?.name || 'All Users'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{n.title}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{n.type}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold">User Details</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{selectedUser.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedUser.user?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedUser.user?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedUser.user?.isSubscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {selectedUser.user?.isSubscribed ? 'Premium' : 'Free'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Recent Calculations</h3>
                <div className="space-y-2">
                  {selectedUser.calculations?.slice(0, 5).map(c => (
                    <div key={c.id} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm uppercase">{c.type}</span>
                      <span className="text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {selectedUser.calculations?.length === 0 && <p className="text-sm text-gray-500">No calculations yet</p>}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Subscription History</h3>
                <div className="space-y-2">
                  {selectedUser.subscriptions?.map(s => (
                    <div key={s.id} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm capitalize">{s.plan}</span>
                      <span className="text-sm text-green-600">₹{s.amount}</span>
                    </div>
                  ))}
                  {selectedUser.subscriptions?.length === 0 && <p className="text-sm text-gray-500">No subscriptions yet</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBroadcast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Broadcast Notification</h2>
              <button onClick={() => setShowBroadcast(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                  placeholder="Enter message"
                />
              </div>
              <button
                onClick={handleBroadcast}
                disabled={!broadcastForm.title || !broadcastForm.message}
                className="w-full py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} /> Send to All Users
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
