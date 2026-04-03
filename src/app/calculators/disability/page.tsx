"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Scale,
  ChevronRight,
  RefreshCw
} from 'lucide-react';


export default function DisabilityCalculator() {
  const router = useRouter();
  const [calculatorType, setCalculatorType] = useState('locomotor');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const [locomotorData, setLocomotorData] = useState({
    extremityType: 'upper',
    subType: 'shoulder',
    impairment: 0
  });

  const [amputationData, setAmputationData] = useState({
    type: 'upper_limb',
    level: 'below_elbow',
    side: 'right'
  });

  const [ptdData, setPtdData] = useState({
    type: 'total',
    nature: 'permanent',
    disability: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Upper Extremity Reference Values (WHO Standards)
  const upperExtremityValues = {
    shoulder: { amputation: 60, limitation: 30, fusion: 40 },
    elbow: { amputation: 55, limitation: 25, fusion: 35 },
    wrist: { amputation: 50, limitation: 20, fusion: 30 },
    fingers: { amputation: 40, limitation: 15, fusion: 25 },
    thumb: { amputation: 25, limitation: 10, fusion: 15 }
  };

  // Lower Extremity Reference Values (WHO Standards)
  const lowerExtremityValues = {
    hip: { amputation: 60, limitation: 35, fusion: 45 },
    knee: { amputation: 50, limitation: 30, fusion: 40 },
    ankle: { amputation: 40, limitation: 20, fusion: 30 },
    foot: { amputation: 35, limitation: 15, fusion: 25 },
    toes: { amputation: 10, limitation: 5, fusion: 8 }
  };

  // Spine Reference Values
  const spineValues = {
    cervical: { total: 60, partial: 25 },
    dorsal: { total: 40, partial: 20 },
    lumbar: { total: 50, partial: 25 }
  };

  // Amputation percentages by level
  const amputationPercentages = {
    upper_limb: {
      shoulder_disarticulation: 100,
      above_elbow: 80,
      below_elbow: 70,
      wrist_disarticulation: 60,
      hand: 55,
      fingers_partial: 20,
      thumb: 15
    },
    lower_limb: {
      hip_disarticulation: 100,
      above_knee: 80,
      below_knee: 65,
      ankle_disarticulation: 40,
      foot: 35,
      toes_partial: 10
    }
  };

  const calculateLocomotor = () => {
    let percentage = 0;
    let description = '';
    let referenceValue = 0;

    if (locomotorData.extremityType === 'upper') {
      const values = upperExtremityValues[locomotorData.subType] || { amputation: 60 };
      referenceValue = values.amputation;
      percentage = Math.round((locomotorData.impairment / 100) * referenceValue);
      description = `Upper Extremity - ${locomotorData.subType.charAt(0).toUpperCase() + locomotorData.subType.slice(1)}`;
    } else if (locomotorData.extremityType === 'lower') {
      const values = lowerExtremityValues[locomotorData.subType] || { amputation: 50 };
      referenceValue = values.amputation;
      percentage = Math.round((locomotorData.impairment / 100) * referenceValue);
      description = `Lower Extremity - ${locomotorData.subType.charAt(0).toUpperCase() + locomotorData.subType.slice(1)}`;
    } else {
      const values = spineValues[locomotorData.subType] || { total: 50 };
      referenceValue = values.total;
      percentage = Math.round((locomotorData.impairment / 100) * referenceValue);
      description = `Spine - ${locomotorData.subType.charAt(0).toUpperCase() + locomotorData.subType.slice(1)}`;
    }

    setResult({
      type: 'Locomotor Disability',
      description,
      impairment: locomotorData.impairment,
      referenceValue,
      percentage,
      wholeBodyDisability: Math.round(percentage * 0.7)
    });
  };

  const calculateAmputation = () => {
    const percentages = amputationPercentages[amputationData.type];
    const percentage = percentages[amputationData.level] || 0;
    const sideMultiplier = amputationData.side === 'both' ? 1.5 : 1;
    const finalPercentage = Math.min(100, Math.round(percentage * sideMultiplier));

    setResult({
      type: 'Amputation',
      level: amputationData.level.replace(/_/g, ' '),
      side: amputationData.side.charAt(0).toUpperCase() + amputationData.side.slice(1),
      percentage: finalPercentage,
      wholeBodyDisability: Math.round(finalPercentage * 0.7)
    });
  };

  const calculatePTD = () => {
    const percentage = ptdData.disability;
    setResult({
      type: ptdData.type === 'total' ? 'Permanent Total Disability' : 'Permanent Partial Disability',
      percentage,
      wholeBodyDisability: Math.round(percentage * 0.7)
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 text-gray-600 hover:text-primary">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Disability Calculator</h1>
              <p className="text-sm text-gray-500">Based on WHO Guidelines</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Calculator Type Selection */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => { setCalculatorType('locomotor'); setResult(null); }}
            className={`p-6 rounded-xl border-2 transition ${calculatorType === 'locomotor' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            <Scale className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h3 className="font-bold">Locomotor Disability</h3>
            <p className="text-sm text-gray-500 mt-1">Upper/Lower Extremity, Spine</p>
          </button>
          <button
            onClick={() => { setCalculatorType('amputation'); setResult(null); }}
            className={`p-6 rounded-xl border-2 transition ${calculatorType === 'amputation' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            <Scale className="w-12 h-12 mx-auto mb-3 text-secondary" />
            <h3 className="font-bold">Amputation</h3>
            <p className="text-sm text-gray-500 mt-1">Upper/Lower Limb</p>
          </button>
          <button
            onClick={() => { setCalculatorType('ptd'); setResult(null); }}
            className={`p-6 rounded-xl border-2 transition ${calculatorType === 'ptd' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            <Scale className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h3 className="font-bold">PTD/PPD</h3>
            <p className="text-sm text-gray-500 mt-1">Permanent Total/Partial</p>
          </button>
        </div>

        {/* Locomotor Disability Calculator */}
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
                </div>
              </div>

              <button onClick={calculateLocomotor}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold">
                Calculate Disability
              </button>
            </div>
          </div>
        )}

        {/* Amputation Calculator */}
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
                        { key: 'wrist_disarticulation', label: 'Wrist' }
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
                        { key: 'ankle_disarticulation', label: 'Ankle' }
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

              <button onClick={calculateAmputation}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold">
                Calculate Disability
              </button>
            </div>
          </div>
        )}

        {/* PTD/PPD Calculator */}
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
                </div>
              </div>

              <button onClick={calculatePTD}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold">
                Calculate Disability
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Assessment Result</h2>
              <button onClick={() => setResult(null)} className="flex items-center gap-2 text-gray-600 hover:text-primary">
                <RefreshCw size={18} /> Reset
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white text-center">
                <p className="text-sm opacity-80">Regional Disability</p>
                <p className="text-4xl font-bold mt-2">{result.percentage}%</p>
              </div>
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-600">Whole Body Disability</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{result.wholeBodyDisability}%</p>
              </div>
              <div className="bg-blue-100 rounded-xl p-6 text-center">
                <p className="text-sm text-blue-700">Disability Type</p>
                <p className="text-xl font-bold text-blue-700 mt-2">{result.type}</p>
              </div>
            </div>

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
