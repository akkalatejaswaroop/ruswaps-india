"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  ArrowLeft,
  Scale,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { calculateDisability, DisabilityInput, DisabilityOutput } from '@/lib/calculations';
import { SavingIndicator } from '@/lib/ui';

type CalculatorType = 'locomotor' | 'amputation' | 'ptd';

interface LocomotorData {
  extremityType: 'upper' | 'lower' | 'spine';
  subType: string;
  impairment: number;
}

interface AmputationData {
  type: 'upper_limb' | 'lower_limb';
  level: string;
  side: 'right' | 'left' | 'both';
}

interface PTDData {
  type: 'total' | 'partial';
  disability: number;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const locomotorSchema = z.object({
  impairment: z.number().min(0, 'Impairment must be at least 0').max(100, 'Cannot exceed 100'),
});

const ptdSchema = z.object({
  disability: z.number().min(0, 'Disability must be at least 0').max(100, 'Cannot exceed 100'),
});

export default function DisabilityCalculator() {
  const router = useRouter();
  const [calculatorType, setCalculatorType] = useState<CalculatorType>('locomotor');
  const [result, setResult] = useState<DisabilityOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [locomotorData, setLocomotorData] = useState<LocomotorData>({
    extremityType: 'upper',
    subType: 'shoulder',
    impairment: 0,
  });

  const [amputationData, setAmputationData] = useState<AmputationData>({
    type: 'upper_limb',
    level: 'shoulder_disarticulation',
    side: 'right',
  });

  const [ptdData, setPtdData] = useState<PTDData>({
    type: 'total',
    disability: 0,
  });

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
      if (calculatorType === 'locomotor') {
        locomotorSchema.parse({ impairment: locomotorData.impairment });
      } else if (calculatorType === 'ptd') {
        ptdSchema.parse({ disability: ptdData.disability });
      }
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

  const calculateResult = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSaveStatus('saving');

    let calculationResult: DisabilityOutput;

    switch (calculatorType) {
      case 'locomotor': {
        const input: DisabilityInput = {
          type: 'locomotor',
          extremityType: locomotorData.extremityType,
          subType: locomotorData.subType,
          impairment: locomotorData.impairment,
        };
        calculationResult = calculateDisability(input);
        calculationResult.description = `${locomotorData.extremityType.charAt(0).toUpperCase() + locomotorData.extremityType.slice(1)} Extremity - ${locomotorData.subType.charAt(0).toUpperCase() + locomotorData.subType.slice(1)}`;
        calculationResult.regionalDisability = locomotorData.impairment;
        break;
      }
      case 'amputation': {
        const input: DisabilityInput = {
          type: 'amputation',
          side: amputationData.side === 'both' ? 'both' : 'single',
          level: amputationData.level,
        };
        calculationResult = calculateDisability(input);
        calculationResult.description = `Amputation - ${amputationData.type.replace('_', ' ').toUpperCase()}`;
        break;
      }
      case 'ptd': {
        const input: DisabilityInput = {
          type: ptdData.type === 'total' ? 'ptd' : 'ppd',
          percentage: ptdData.disability,
          side: 'single',
        };
        calculationResult = calculateDisability(input);
        calculationResult.description = ptdData.type === 'total' ? 'Permanent Total Disability' : 'Permanent Partial Disability';
        break;
      }
      default:
        setIsLoading(false);
        return;
    }

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
          type: 'disability',
          data: {
            type: calculatorType,
            percentage: calculationResult.regionalDisability,
            side: calculationResult.side,
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

  const resetForm = () => {
    setResult(null);
    setError(null);
    setErrors({});
    setSaveStatus('idle');
    setLocomotorData({ extremityType: 'upper', subType: 'shoulder', impairment: 0 });
    setAmputationData({ type: 'upper_limb', level: 'shoulder_disarticulation', side: 'right' });
    setPtdData({ type: 'total', disability: 0 });
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
                <h1 className="text-xl font-bold text-gray-900">Disability Calculator</h1>
                <p className="text-sm text-gray-500">Based on WHO Guidelines</p>
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => { setCalculatorType('locomotor'); setResult(null); setErrors({}); }}
            className={`p-6 rounded-xl border-2 transition ${calculatorType === 'locomotor' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            <Scale className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h3 className="font-bold">Locomotor Disability</h3>
            <p className="text-sm text-gray-500 mt-1">Upper/Lower Extremity, Spine</p>
          </button>
          <button
            onClick={() => { setCalculatorType('amputation'); setResult(null); setErrors({}); }}
            className={`p-6 rounded-xl border-2 transition ${calculatorType === 'amputation' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            <Scale className="w-12 h-12 mx-auto mb-3 text-secondary" />
            <h3 className="font-bold">Amputation</h3>
            <p className="text-sm text-gray-500 mt-1">Upper/Lower Limb</p>
          </button>
          <button
            onClick={() => { setCalculatorType('ptd'); setResult(null); setErrors({}); }}
            className={`p-6 rounded-xl border-2 transition ${calculatorType === 'ptd' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            <Scale className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h3 className="font-bold">PTD/PPD</h3>
            <p className="text-sm text-gray-500 mt-1">Permanent Total/Partial</p>
          </button>
        </div>

        {calculatorType === 'locomotor' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Locomotor Disability Assessment</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Extremity Type</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => setLocomotorData({...locomotorData, extremityType: 'upper', subType: 'shoulder'})}
                      className={`p-4 rounded-xl border-2 ${locomotorData.extremityType === 'upper' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Upper Extremity
                    </button>
                    <button onClick={() => setLocomotorData({...locomotorData, extremityType: 'lower', subType: 'hip'})}
                      className={`p-4 rounded-xl border-2 ${locomotorData.extremityType === 'lower' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Lower Extremity
                    </button>
                    <button onClick={() => setLocomotorData({...locomotorData, extremityType: 'spine', subType: 'cervical'})}
                      className={`p-4 rounded-xl border-2 ${locomotorData.extremityType === 'spine' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Spine
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Specific Location</label>
                  {locomotorData.extremityType === 'upper' && (
                    <div className="grid grid-cols-5 gap-2">
                      {['shoulder', 'elbow', 'wrist', 'fingers', 'thumb'].map(type => (
                        <button key={type} onClick={() => setLocomotorData({...locomotorData, subType: type})}
                          className={`p-3 rounded-lg capitalize ${locomotorData.subType === type ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                  {locomotorData.extremityType === 'lower' && (
                    <div className="grid grid-cols-5 gap-2">
                      {['hip', 'knee', 'ankle', 'foot', 'toes'].map(type => (
                        <button key={type} onClick={() => setLocomotorData({...locomotorData, subType: type})}
                          className={`p-3 rounded-lg capitalize ${locomotorData.subType === type ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                  {locomotorData.extremityType === 'spine' && (
                    <div className="grid grid-cols-3 gap-2">
                      {['cervical', 'dorsal', 'lumbar'].map(type => (
                        <button key={type} onClick={() => setLocomotorData({...locomotorData, subType: type})}
                          className={`p-3 rounded-lg capitalize ${locomotorData.subType === type ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Impairment Level: {locomotorData.impairment}%
                  </label>
                  <input type="range" min="0" max="100" value={locomotorData.impairment}
                    onChange={(e) => setLocomotorData({...locomotorData, impairment: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>
                  {errors.impairment && <p className="text-red-500 text-sm mt-1">{errors.impairment}</p>}
                </div>
              </div>

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3 mt-6">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-yellow-800">{error}</p>
                </div>
              )}

              <button onClick={calculateResult} disabled={isLoading}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Calculating...</>
                ) : (
                  <><Scale size={20} /> Calculate Disability</>
                )}
              </button>
            </div>
          </div>
        )}

        {calculatorType === 'amputation' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Amputation Assessment</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Limb Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setAmputationData({...amputationData, type: 'upper_limb'})}
                      className={`p-4 rounded-xl border-2 ${amputationData.type === 'upper_limb' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Upper Limb
                    </button>
                    <button onClick={() => setAmputationData({...amputationData, type: 'lower_limb'})}
                      className={`p-4 rounded-xl border-2 ${amputationData.type === 'lower_limb' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Lower Limb
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Amputation Level</label>
                  {amputationData.type === 'upper_limb' && (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'shoulder_disarticulation', label: 'Shoulder' },
                        { key: 'above_elbow', label: 'Above Elbow' },
                        { key: 'below_elbow', label: 'Below Elbow' },
                        { key: 'wrist_disarticulation', label: 'Wrist' },
                      ].map(item => (
                        <button key={item.key} onClick={() => setAmputationData({...amputationData, level: item.key})}
                          className={`p-3 rounded-lg text-sm ${amputationData.level === item.key ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {amputationData.type === 'lower_limb' && (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'hip_disarticulation', label: 'Hip' },
                        { key: 'above_knee', label: 'Above Knee' },
                        { key: 'below_knee', label: 'Below Knee' },
                        { key: 'ankle_disarticulation', label: 'Ankle' },
                      ].map(item => (
                        <button key={item.key} onClick={() => setAmputationData({...amputationData, level: item.key})}
                          className={`p-3 rounded-lg text-sm ${amputationData.level === item.key ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Side Affected</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => setAmputationData({...amputationData, side: 'right'})}
                      className={`p-4 rounded-xl border-2 ${amputationData.side === 'right' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Right
                    </button>
                    <button onClick={() => setAmputationData({...amputationData, side: 'left'})}
                      className={`p-4 rounded-xl border-2 ${amputationData.side === 'left' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Left
                    </button>
                    <button onClick={() => setAmputationData({...amputationData, side: 'both'})}
                      className={`p-4 rounded-xl border-2 ${amputationData.side === 'both' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Both
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3 mt-6">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-yellow-800">{error}</p>
                </div>
              )}

              <button onClick={calculateResult} disabled={isLoading}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Calculating...</>
                ) : (
                  <><Scale size={20} /> Calculate Disability</>
                )}
              </button>
            </div>
          </div>
        )}

        {calculatorType === 'ptd' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Permanent Total/Partial Disability</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Disability Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setPtdData({...ptdData, type: 'total'})}
                      className={`p-4 rounded-xl border-2 ${ptdData.type === 'total' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Permanent Total Disability
                    </button>
                    <button onClick={() => setPtdData({...ptdData, type: 'partial'})}
                      className={`p-4 rounded-xl border-2 ${ptdData.type === 'partial' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      Permanent Partial Disability
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Disability Percentage: {ptdData.disability}%
                  </label>
                  <input type="range" min="0" max="100" value={ptdData.disability}
                    onChange={(e) => setPtdData({...ptdData, disability: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>
                  {errors.disability && <p className="text-red-500 text-sm mt-1">{errors.disability}</p>}
                </div>
              </div>

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3 mt-6">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-yellow-800">{error}</p>
                </div>
              )}

              <button onClick={calculateResult} disabled={isLoading}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Calculating...</>
                ) : (
                  <><Scale size={20} /> Calculate Disability</>
                )}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={28} />
                <h2 className="text-xl font-bold text-gray-900">Assessment Result</h2>
              </div>
              <button onClick={resetForm} className="flex items-center gap-2 text-gray-600 hover:text-primary">
                <RefreshCw size={18} /> Reset
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white text-center">
                <p className="text-sm opacity-80">Regional Disability</p>
                <p className="text-4xl font-bold mt-2">{result.regionalDisability}%</p>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-600">Whole Body Disability</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{result.wholeBodyDisability}%</p>
              </div>
              <div className="bg-blue-100 rounded-xl p-6 text-center">
                <p className="text-sm text-blue-700">Disability Type</p>
                <p className="text-xl font-bold text-blue-700 mt-2">{result.type.toUpperCase()}</p>
              </div>
            </div>

            {result.description && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-center text-gray-700">{result.description}</p>
              </div>
            )}

            <div className="bg-yellow-50 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Assessment Notes</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Based on WHO Guidelines for disability assessment</li>
                <li>• Regional disability calculated as per anatomical percentage</li>
                <li>• Whole body disability (WBD) = Regional × 0.7</li>
                <li>• This is for reference purposes only</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
