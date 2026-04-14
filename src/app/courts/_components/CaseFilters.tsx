"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, X } from 'lucide-react';
import { AP_DISTRICTS, AP_MANDALS } from '../../../../prisma/seeds/ap-locations';

export default function CaseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [districtCode, setDistrictCode] = useState(searchParams.get('districtCode') || '');
  const [mandalCode, setMandalCode] = useState(searchParams.get('mandalCode') || '');
  const [caseNumber, setCaseNumber] = useState(searchParams.get('caseNumber') || '');
  const [cnrNumber, setCnrNumber] = useState(searchParams.get('cnrNumber') || '');
  const [petitioner, setPetitioner] = useState(searchParams.get('petitioner') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(false);

  const selectedDistrict = AP_DISTRICTS.find(d => d.code === districtCode);
  const mandals = districtCode ? (AP_MANDALS[districtCode] || []) : [];

  const handleDistrictChange = (code: string) => {
    setDistrictCode(code);
    setMandalCode('');
  };

  const handleSearch = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (districtCode) params.set('districtCode', districtCode);
    if (mandalCode) params.set('mandalCode', mandalCode);
    if (caseNumber) params.set('caseNumber', caseNumber);
    if (cnrNumber) params.set('cnrNumber', cnrNumber);
    if (petitioner) params.set('petitioner', petitioner);
    if (status) params.set('status', status);
    router.push(`/courts?${params.toString()}`);
  };

  const handleClear = () => {
    setDistrictCode('');
    setMandalCode('');
    setCaseNumber('');
    setCnrNumber('');
    setPetitioner('');
    setStatus('');
    router.push('/courts');
  };

  const hasFilters = districtCode || mandalCode || caseNumber || cnrNumber || petitioner || status;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <select
            value={districtCode}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Districts</option>
            {AP_DISTRICTS.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mandal / Sub-district</label>
          <select
            value={mandalCode}
            onChange={(e) => setMandalCode(e.target.value)}
            disabled={!districtCode}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Mandals</option>
            {mandals.map((m) => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
          <input
            type="text"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="e.g. AP0123456789"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNR Number</label>
          <input
            type="text"
            value={cnrNumber}
            onChange={(e) => setCnrNumber(e.target.value)}
            placeholder="e.g. APKR010234562024"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Petitioner Name</label>
          <input
            type="text"
            value={petitioner}
            onChange={(e) => setPetitioner(e.target.value)}
            placeholder="Enter party name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Next Hearing">Next Hearing</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>

        <div className="lg:col-span-2 flex items-end gap-3">
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
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
