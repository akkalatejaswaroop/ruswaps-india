"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, Calculator, Download, RefreshCw, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { calculateIncomeTax, IncomeTaxInput, IncomeTaxOutput } from '@/lib/calculations';
import { SavingIndicator } from '@/lib/ui';

interface IncomeTaxFormData {
  awardAmount: number;
  interestRate: number;
  days: number;
  hasPAN: boolean;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const incomeTaxFormSchema = z.object({
  awardAmount: z.number().min(0, 'Amount must be at least 0').max(1000000000, 'Amount is too high'),
  interestRate: z.number().min(0, 'Rate must be at least 0').max(100, 'Rate cannot exceed 100'),
  days: z.number().min(1, 'Days must be at least 1').max(3650, 'Days cannot exceed 3650'),
});

export default function IncomeTaxInterestCalculator() {
  const router = useRouter();
  const [formData, setFormData] = useState<IncomeTaxFormData>({
    awardAmount: 100000,
    interestRate: 7,
    days: 180,
    hasPAN: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<IncomeTaxOutput | null>(null);
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
        awardAmount: formData.awardAmount,
        interestRate: formData.interestRate,
        days: formData.days,
      };
      
      incomeTaxFormSchema.parse(dataToValidate);
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

  const calculateInterest = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSaveStatus('saving');

    const taxInput: IncomeTaxInput = {
      awardAmount: formData.awardAmount,
      interestRate: formData.interestRate,
      days: formData.days,
      hasPAN: formData.hasPAN,
    };

    const calculationResult = calculateIncomeTax(taxInput);
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
          type: 'income-tax',
          data: taxInput,
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
                <h1 className="text-xl font-bold text-gray-900">Income Tax on Interest</h1>
                <p className="text-sm text-gray-500">Calculate TDS on interest</p>
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
          <h2 className="text-xl font-bold text-gray-900 mb-6">Enter Details</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Award Amount (Rs.)</label>
              <input
                type="number"
                value={formData.awardAmount}
                onChange={(e) => setFormData({...formData, awardAmount: Math.max(0, parseInt(e.target.value) || 0)})}
                className={inputClass('awardAmount')}
              />
              {errors.awardAmount && <p className="text-red-500 text-sm mt-1">{errors.awardAmount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
              <input
                type="number"
                value={formData.interestRate}
                onChange={(e) => setFormData({...formData, interestRate: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))})}
                className={inputClass('interestRate')}
                step="0.1"
              />
              {errors.interestRate && <p className="text-red-500 text-sm mt-1">{errors.interestRate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Days</label>
              <input
                type="number"
                value={formData.days}
                onChange={(e) => setFormData({...formData, days: Math.max(1, parseInt(e.target.value) || 1)})}
                className={inputClass('days')}
              />
              {errors.days && <p className="text-red-500 text-sm mt-1">{errors.days}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">PAN Available?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData({...formData, hasPAN: true})}
                  className={`p-4 rounded-xl border-2 ${formData.hasPAN ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                >
                  Yes, PAN Available
                </button>
                <button
                  onClick={() => setFormData({...formData, hasPAN: false})}
                  className={`p-4 rounded-xl border-2 ${!formData.hasPAN ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                >
                  No PAN
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
            )}

            <button
              onClick={calculateInterest}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 size={20} className="animate-spin" /> Calculating...</>
              ) : (
                <><Calculator size={20} /> Calculate Interest</>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={28} />
                  <h2 className="text-xl font-bold text-gray-900">Calculation Results</h2>
                </div>
                <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
                  <Download size={18} /> Download Report
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Award Amount</span>
                  <span className="font-bold text-lg">Rs.{result.awardAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-bold text-lg">{result.interestRate}%</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Period</span>
                  <span className="font-bold text-lg">{result.days} days</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                  <span className="text-yellow-800 font-medium">Gross Interest</span>
                  <span className="font-bold text-xl text-yellow-800">Rs.{result.grossInterest.toLocaleString()}</span>
                </div>
                
                {result.tdsApplicable && (
                  <>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                      <span className="text-red-700">TDS Rate ({result.hasPAN ? 'With PAN' : 'Without PAN'})</span>
                      <span className="font-bold text-lg text-red-700">{result.tdsRate}%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                      <span className="text-red-700">TDS Amount</span>
                      <span className="font-bold text-lg text-red-700">Rs.{result.tdsAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center p-4 bg-green-100 rounded-xl border-2 border-green-300">
                  <span className="text-green-800 font-bold">Net Interest Payable</span>
                  <span className="font-bold text-2xl text-green-800">Rs.{result.netPayable.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-2">Important Notes</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• TDS is deducted under Section 194A of Income Tax Act</li>
                  <li>• With PAN: TDS @10% if interest exceeds Rs.10,000</li>
                  <li>• Without PAN: TDS @20% (higher rate)</li>
                  <li>• TDS certificate (Form 16A) can be downloaded from TRACES</li>
                </ul>
              </div>

              <button
                onClick={() => { setFormData({...formData, awardAmount: 100000, interestRate: 7, days: 180, hasPAN: true}); setResult(null); setError(null); setErrors({}); setSaveStatus('idle'); }}
                className="w-full mt-6 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} /> Reset
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
