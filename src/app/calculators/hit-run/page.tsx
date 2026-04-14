"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, AlertTriangle, Calculator, Download, RefreshCw, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { calculateHitRun, HitRunInput, HitRunOutput } from '@/lib/calculations';
import { SavingIndicator } from '@/lib/ui';

interface HitRunFormData {
  caseNo: string;
  caseYear: number;
  deathCount: number;
  driverIdentified: boolean;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const hitRunFormSchema = z.object({
  deathCount: z.number().min(1, 'Must have at least 1 death').max(1000, 'Number is too high'),
});

export default function HitRunCalculator() {
  const router = useRouter();
  const [formData, setFormData] = useState<HitRunFormData>({
    caseNo: '',
    caseYear: new Date().getFullYear(),
    deathCount: 1,
    driverIdentified: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<HitRunOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await fetch('/api/user/profile', {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return false;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setAuthError(`Authentication check failed: ${message}`);
      router.push('/login');
      return false;
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const validateForm = (): boolean => {
    try {
      const dataToValidate = {
        deathCount: formData.deathCount,
      };
      
      hitRunFormSchema.parse(dataToValidate);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        const zodErrors = err as z.ZodError<Record<string, unknown>>;
        zodErrors.issues.forEach((issue) => {
          const field = issue.path[0];
          if (field) {
            newErrors[field as string] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const calculateCompensation = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSaveStatus('saving');

    const hitRunInput: HitRunInput = {
      deathCount: formData.deathCount,
      driverIdentified: formData.driverIdentified,
    };

    const calculationResult = calculateHitRun(hitRunInput);
    setResult(calculationResult);
    setIsLoading(false);

    try {
      const res = await fetch(`/api/calculations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'hit-run',
          data: hitRunInput,
        }),
      });

      const responseData = await res.json();

      if (!res.ok || !responseData.success) {
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to save calculation to server:', err);
      setSaveStatus('error');
      setError('Calculation completed but could not save to server.');
    }
  };

  const generatePDF = () => {
    if (!result) return;
    window.open(`/api/calculations/pdf?id=${Date.now()}`, '_blank');
  };

  const resetForm = () => {
    setFormData({
      caseNo: '',
      caseYear: new Date().getFullYear(),
      deathCount: 1,
      driverIdentified: false,
    });
    setResult(null);
    setError(null);
    setErrors({});
    setSaveStatus('idle');
  };

  const inputClass = (field: string) => {
    const base = 'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition';
    return errors[field] ? `${base} border-red-500` : `${base} border-gray-300`;
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-lg">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle size={24} />
            <h2 className="text-xl font-bold">Authentication Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{authError}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 text-gray-600 hover:text-primary">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Hit & Run Cases</h1>
                <p className="text-sm text-gray-500">Special compensation calculator</p>
              </div>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <SavingIndicator status={saveStatus} />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Enter Case Details</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Case Number</label>
                <input type="text" value={formData.caseNo}
                  onChange={(e) => setFormData({...formData, caseNo: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input type="number" value={formData.caseYear}
                  onChange={(e) => setFormData({...formData, caseYear: parseInt(e.target.value) || new Date().getFullYear()})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Deaths</label>
              <input type="number" value={formData.deathCount}
                onChange={(e) => setFormData({...formData, deathCount: Math.max(1, parseInt(e.target.value) || 1)})}
                className={inputClass('deathCount')}
                min="1" />
              {errors.deathCount && <p className="text-red-500 text-sm mt-1">{errors.deathCount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Was the Driver Identified?</label>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setFormData({...formData, driverIdentified: true})}
                  className={`p-4 rounded-xl border-2 ${formData.driverIdentified ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                  Yes, Identified
                </button>
                <button onClick={() => setFormData({...formData, driverIdentified: false})}
                  className={`p-4 rounded-xl border-2 ${!formData.driverIdentified ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                  No, Untraced
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Under the Motor Vehicles Act, hit and run cases have special compensation provisions:
                <br/>• Driver Identified: Rs.5,00,000 per death
                <br/>• Driver Untraced: Rs.2,50,000 per death
              </p>
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
            )}

            <button onClick={calculateCompensation} disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? (
                <><Loader2 size={20} className="animate-spin" /> Calculating...</>
              ) : (
                <><Calculator size={20} /> Calculate Compensation</>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 space-y-6">
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle size={28} />
                <h3 className="text-lg font-semibold">Compensation Result</h3>
              </div>
              <div className="text-center">
                <p className="text-sm opacity-90">Total Compensation</p>
                <p className="text-5xl font-bold mt-2">Rs.{result.totalCompensation.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Breakdown</h3>
                <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
                  <Download size={18} /> Download Report
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Driver Status</span>
                  <span className="font-semibold">{result.driverStatus}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Per Case Amount</span>
                  <span className="font-semibold">Rs.{result.perCaseAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Number of Deaths</span>
                  <span className="font-semibold">{result.deathCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-100 rounded-lg border-2 border-green-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-green-700 text-xl">Rs.{result.totalCompensation.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button onClick={resetForm}
              className="w-full py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition">
              <RefreshCw size={20} /> Reset
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
