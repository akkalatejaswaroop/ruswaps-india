/**
 * Revenue Tracker component for lawyers to track fees and settlements.
 */
"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Trash2, 
  Calendar, 
  Briefcase,
  Search,
  Download
} from 'lucide-react';
import { PremiumCard, PremiumBadge } from './PremiumCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface RevenueEntry {
  id: string;
  caseName: string;
  amount: number;
  type: string;
  date: string;
  notes?: string;
}

export function RevenueTracker() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    caseName: '',
    amount: '',
    type: 'legal-fee',
    notes: '',
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/revenue');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch revenue:', err);
    }
    setLoading(false);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          amount: parseFloat(newEntry.amount),
        }),
      });

      if (res.ok) {
        fetchEntries();
        setShowAddForm(false);
        setNewEntry({ caseName: '', amount: '', type: 'legal-fee', notes: '' });
      }
    } catch (err) {
      console.error('Failed to add entry:', err);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/revenue?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const totalRevenue = entries.reduce((sum, e) => sum + e.amount, 0);
  
  // Prepare chart data (last 6 months or current data)
  const chartData = entries.reduce((acc: any[], entry) => {
    const month = new Date(entry.date).toLocaleString('en-IN', { month: 'short' });
    const existing = acc.find(i => i.month === month);
    if (existing) {
      existing.amount += entry.amount;
    } else {
      acc.push({ month, amount: entry.amount });
    }
    return acc;
  }, []).slice(-6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold premium-gradient-text">Revenue & Fee Tracker</h2>
          <p className="text-sm text-gray-500">Monitor your earnings and case settlements</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          Add Fee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PremiumCard className="md:col-span-2 min-h-[300px]">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Earnings Overview</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(1, 124, 67, 0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#017c43' : '#3dbfb7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>

        <PremiumCard className="bg-primary text-white">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-white/80 text-sm">Total Revenue</p>
              <p className="text-4xl font-bold mt-2">₹{totalRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 mt-8 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} />
                <div>
                  <p className="text-xs text-white/70">Top Category</p>
                  <p className="font-semibold">Legal Fees</p>
                </div>
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>

      <PremiumCard className="overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900">Recent Transactions</h3>
          <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-primary transition rounded-lg hover:bg-gray-100">
              <Search size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-primary transition rounded-lg hover:bg-gray-100">
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-y border-gray-100">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Case / Client</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4 h-16 bg-gray-50/20"></td>
                  </tr>
                ))
              ) : entries.length > 0 ? (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{entry.caseName}</p>
                      {entry.notes && <p className="text-xs text-gray-500 truncate max-w-[200px]">{entry.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <PremiumBadge className={
                        entry.type === 'settlement' ? 'bg-amber-100 text-amber-600 border-amber-200' : ''
                      }>
                        {entry.type.replace('-', ' ')}
                      </PremiumBadge>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      ₹{entry.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <DollarSign size={40} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-500">No revenue entries found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <PremiumCard className="max-w-md w-full animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Add New Fee Entry</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Name / Client</label>
                <input
                  required
                  type="text"
                  value={newEntry.caseName}
                  onChange={e => setNewEntry({...newEntry, caseName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition"
                  placeholder="e.g. Rahul vs State"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    required
                    type="number"
                    value={newEntry.amount}
                    onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newEntry.type}
                    onChange={e => setNewEntry({...newEntry, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition appearance-none"
                  >
                    <option value="legal-fee">Legal Fee</option>
                    <option value="settlement">Settlement</option>
                    <option value="commission">Commission</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={newEntry.notes}
                  onChange={e => setNewEntry({...newEntry, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition h-20 resize-none"
                  placeholder="Add details about this payment..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition shadow-lg shadow-primary/20"
              >
                Save Entry
              </button>
            </form>
          </PremiumCard>
        </div>
      )}
    </div>
  );
}
