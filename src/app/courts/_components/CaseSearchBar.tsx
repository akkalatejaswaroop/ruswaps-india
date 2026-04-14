"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, X } from 'lucide-react';

interface CaseSearchBarProps {
  onResultsChange?: (total: number) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Disposed', label: 'Disposed' },
  { value: 'Next Hearing', label: 'Next Hearing' },
];

export default function CaseSearchBar({ onResultsChange }: CaseSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [state, setState] = useState(searchParams.get('state') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [taluka, setTaluka] = useState(searchParams.get('taluka') || '');
  const [caseNumber, setCaseNumber] = useState(searchParams.get('caseNumber') || '');
  const [cnrNumber, setCnrNumber] = useState(searchParams.get('cnrNumber') || '');
  const [petitioner, setPetitioner] = useState(searchParams.get('petitioner') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await fetch('/api/courts/cases?distinctStates=true', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setStates(data.data?.states || []);
          setDistricts(data.data?.districts || []);
        }
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
      setInitialLoading(false);
    };
    loadFilters();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (district) params.set('district', district);
    if (taluka) params.set('taluka', taluka);
    if (caseNumber) params.set('caseNumber', caseNumber);
    if (cnrNumber) params.set('cnrNumber', cnrNumber);
    if (petitioner) params.set('petitioner', petitioner);
    if (status) params.set('status', status);
    
    sessionStorage.setItem('courts-search-params', params.toString());
    router.push(`/courts?${params.toString()}`);
  };

  const handleClear = () => {
    setState('');
    setDistrict('');
    setTaluka('');
    setCaseNumber('');
    setCnrNumber('');
    setPetitioner('');
    setStatus('');
    router.push('/courts');
  };

  const hasFilters = state || district || taluka || caseNumber || cnrNumber || petitioner || status;

  if (initialLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Taluka / Mandal</label>
          <input
            type="text"
            value={taluka}
            onChange={(e) => setTaluka(e.target.value)}
            placeholder="Enter taluka"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
          <input
            type="text"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="Enter case number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNR Number</label>
          <input
            type="text"
            value={cnrNumber}
            onChange={(e) => setCnrNumber(e.target.value)}
            placeholder="Enter CNR number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Petitioner / Respondent</label>
          <input
            type="text"
            value={petitioner}
            onChange={(e) => setPetitioner(e.target.value)}
            placeholder="Enter party name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          Search
        </button>
        
        {hasFilters && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
          >
            <X size={18} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}