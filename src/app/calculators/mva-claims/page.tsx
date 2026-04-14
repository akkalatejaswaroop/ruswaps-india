"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  ArrowLeft,
  Calculator,
  Download,
  User,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { calculateMVA, getAgeFactor, MVAInput, MVAOutput, mvaInputSchema } from '@/lib/calculations';
import { SavingIndicator, ProgressSteps } from '@/lib/ui';

interface MVAFormData {
  caseNo: string;
  caseYear: number;
  courtName: string;
  age: number;
  income: number;
  dependents: number;
  disabilityPercentage: number;
  otherExpenses: number;
  interestRate: number;
  days: number;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const mvaFormSchema = z.object({
  age: z.number().min(0, 'Age must be at least 0').max(120, 'Age must be at most 120'),
  income: z.number().min(0, 'Income must be at least 0').max(100000000, 'Income is too high'),
  dependents: z.number().min(0, 'Dependents cannot be negative').max(50, 'Too many dependents'),
  disabilityPercentage: z.number().min(0, 'Percentage must be at least 0').max(100, 'Percentage cannot exceed 100'),
  otherExpenses: z.number().min(0, 'Expenses cannot be negative'),
  interestRate: z.number().min(0, 'Rate must be at least 0').max(100, 'Rate cannot exceed 100'),
  days: z.number().min(1, 'Days must be at least 1').max(3650, 'Days cannot exceed 3650'),
});

export default function MVAClaimsCalculator() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [claimType, setClaimType] = useState<'fatal' | 'non-fatal'>('fatal');
  const [claimantType, setClaimantType] = useState<'married' | 'bachelor' | 'minor'>('married');
  const [formData, setFormData] = useState<MVAFormData>({
    caseNo: '',
    caseYear: new Date().getFullYear(),
    courtName: '',
    age: 30,
    income: 25000,
    dependents: 2,
    disabilityPercentage: 0,
    otherExpenses: 0,
    interestRate: 7,
    days: 365,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<MVAOutput | null>(null);
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
      const dataToValidate = claimType === 'fatal'
        ? { age: formData.age, income: formData.income, dependents: formData.dependents, interestRate: formData.interestRate, days: formData.days, otherExpenses: formData.otherExpenses }
        : { age: formData.age, income: formData.income, disabilityPercentage: formData.disabilityPercentage, interestRate: formData.interestRate, days: formData.days, otherExpenses: formData.otherExpenses };
      
      mvaFormSchema.parse(dataToValidate);
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

    const mvaInput: MVAInput = {
      claimType,
      age: formData.age,
      monthlyIncome: formData.income,
      dependents: formData.dependents,
      disabilityPercentage: formData.disabilityPercentage,
      otherExpenses: formData.otherExpenses,
      interestRate: formData.interestRate,
      days: formData.days,
      claimantType,
    };

    const calculationResult = calculateMVA(mvaInput);
    setResult(calculationResult);
    setStep(3);
    setIsLoading(false);

    try {
      const res = await fetch(`/api/calculations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'mva',
          data: {
            claimType,
            claimantType,
            age: formData.age,
            monthlyIncome: formData.income,
            dependents: formData.dependents,
            disabilityPercentage: formData.disabilityPercentage,
            otherExpenses: formData.otherExpenses,
            interestRate: formData.interestRate,
            days: formData.days,
          },
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
    setStep(1);
    setClaimType('fatal');
    setClaimantType('married');
    setFormData({
      caseNo: '',
      caseYear: new Date().getFullYear(),
      courtName: '',
      age: 30,
      income: 25000,
      dependents: 2,
      disabilityPercentage: 0,
      otherExpenses: 0,
      interestRate: 7,
      days: 365,
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
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 text-gray-600 hover:text-primary">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MVA Claims Calculator</h1>
                <p className="text-sm text-gray-500">Motor Vehicle Accident Compensation</p>
              </div>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <SavingIndicator status={saveStatus} />
                <button
                  onClick={generatePDF}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  <FileText size={18} />
                  <span>Download Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <ProgressSteps current={step - 1} total={3} />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Claim Type</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={() => setClaimType('fatal')}
                  className={`p-6 rounded-xl border-2 transition ${
                    claimType === 'fatal'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                    <User className="text-red-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Fatal / Death Claim</h3>
                  <p className="text-gray-600">For claims involving death of the victim</p>
                </button>

                <button
                  onClick={() => setClaimType('non-fatal')}
                  className={`p-6 rounded-xl border-2 transition ${
                    claimType === 'non-fatal'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                    <User className="text-orange-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Non-Fatal / Injury Claim</h3>
                  <p className="text-gray-600">For claims involving injuries</p>
                </button>
              </div>
            </div>

            {claimType === 'fatal' && (
              <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Select Claimant Status</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {(['married', 'bachelor', 'minor'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setClaimantType(type)}
                      className={`p-4 rounded-xl border-2 capitalize transition ${
                        claimantType === type
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <User className="mx-auto mb-2" size={32} />
                      <span className="font-semibold">{type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
              Continue to Enter Details
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Enter Case Details</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Case Number</label>
                  <input
                    type="text"
                    value={formData.caseNo}
                    onChange={(e) => setFormData({ ...formData, caseNo: e.target.value })}
                    className={inputClass('caseNo')}
                    placeholder="e.g., MVC 1234/2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.caseYear}
                    onChange={(e) => setFormData({ ...formData, caseYear: parseInt(e.target.value) || new Date().getFullYear() })}
                    className={inputClass('caseYear')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Court Name</label>
                  <input
                    type="text"
                    value={formData.courtName}
                    onChange={(e) => setFormData({ ...formData, courtName: e.target.value })}
                    className={inputClass('courtName')}
                    placeholder="e.g., City Civil Court, Tenali"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age of {claimType === 'fatal' ? 'Deceased' : 'Injured'} (Years)
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Math.max(0, Math.min(120, parseInt(e.target.value) || 0)) })}
                    className={inputClass('age')}
                    min="0"
                    max="120"
                  />
                  {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
                  <p className="text-xs text-gray-500 mt-1">Age Factor: {getAgeFactor(formData.age)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income (Rs.)</label>
                  <input
                    type="number"
                    value={formData.income}
                    onChange={(e) => setFormData({ ...formData, income: Math.max(0, parseInt(e.target.value) || 0) })}
                    className={inputClass('income')}
                  />
                  {errors.income && <p className="text-red-500 text-sm mt-1">{errors.income}</p>}
                </div>

                {claimType === 'fatal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Dependents</label>
                    <input
                      type="number"
                      value={formData.dependents}
                      onChange={(e) => setFormData({ ...formData, dependents: Math.max(0, parseInt(e.target.value) || 0) })}
                      className={inputClass('dependents')}
                      min="0"
                    />
                    {errors.dependents && <p className="text-red-500 text-sm mt-1">{errors.dependents}</p>}
                  </div>
                )}

                {claimType === 'non-fatal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Disability Percentage (%)</label>
                    <input
                      type="number"
                      value={formData.disabilityPercentage}
                      onChange={(e) => setFormData({ ...formData, disabilityPercentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                      className={inputClass('disabilityPercentage')}
                      min="0"
                      max="100"
                    />
                    {errors.disabilityPercentage && <p className="text-red-500 text-sm mt-1">{errors.disabilityPercentage}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Other Expenses (Rs.)</label>
                  <input
                    type="number"
                    value={formData.otherExpenses}
                    onChange={(e) => setFormData({ ...formData, otherExpenses: Math.max(0, parseInt(e.target.value) || 0) })}
                    className={inputClass('otherExpenses')}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                  <input
                    type="number"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
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
                    onChange={(e) => setFormData({ ...formData, days: Math.max(1, parseInt(e.target.value) || 1) })}
                    className={inputClass('days')}
                  />
                  {errors.days && <p className="text-red-500 text-sm mt-1">{errors.days}</p>}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={calculateCompensation}
                disabled={isLoading}
                className="flex-1 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator size={20} />
                    Calculate Compensation
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={28} />
                  <h2 className="text-2xl font-bold text-gray-900">Calculation Results</h2>
                </div>
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 text-gray-600 hover:text-primary"
                >
                  <RefreshCw size={18} />
                  New Calculation
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white">
                  <p className="text-sm opacity-80">Total Compensation</p>
                  <p className="text-3xl font-bold mt-1">Rs.{result.totalCompensation.toLocaleString()}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-6">
                  <p className="text-sm text-gray-600">Interest Amount</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">Rs.{result.interestAmount.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 rounded-xl p-6">
                  <p className="text-sm text-green-700">Total with Interest</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">Rs.{result.totalWithInterest.toLocaleString()}</p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h3 className="font-semibold text-gray-900">Detailed Breakdown</h3>
                </div>
                <div className="p-6 space-y-4">
                  {claimType === 'fatal' ? (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Loss of Dependency (50%)</span>
                        <span className="font-semibold">Rs.{result.lossOfDependency?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Funeral Expenses</span>
                        <span className="font-semibold">Rs.{result.funeralExpenses?.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Loss of Earning Capacity (60%)</span>
                        <span className="font-semibold">Rs.{result.lossOfEarningCapacity?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Disability Percentage</span>
                        <span className="font-semibold">{formData.disabilityPercentage}%</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Other Expenses</span>
                    <span className="font-semibold">Rs.{result.otherExpenses?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Interest Rate</span>
                    <span className="font-semibold">{result.interestRate}%</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-lg">
                    <span className="font-bold text-gray-900">Total Interest</span>
                    <span className="font-bold text-green-700">Rs.{result.interestAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Modify Details
              </button>
              <button
                onClick={generatePDF}
                className="flex-1 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download Report
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
