"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Calculator, Download, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export default function HitRunCalculator() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    caseNo: '',
    caseYear: new Date().getFullYear(),
    deathCount: 1,
    hasDriver: false,
    driverIdentified: false
  });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const COMPENSATION_RATES = {
    death: 500000,
    untraced: 250000
  };

  const calculateCompensation = async () => {
    let perCaseCompensation = formData.driverIdentified 
      ? COMPENSATION_RATES.death 
      : COMPENSATION_RATES.untraced;
    
    const totalCompensation = perCaseCompensation * formData.deathCount;
    
    const calculationResult = {
      caseNo: formData.caseNo,
      caseYear: formData.caseYear,
      deathCount: formData.deathCount,
      driverStatus: formData.driverIdentified ? 'Identified' : 'Untraced',
      perCaseAmount: perCaseCompensation,
      totalCompensation
    };
    
    setResult(calculationResult);

    const token = localStorage.getItem('accessToken');
    if (token) {
      setSaving(true);
      try {
        await fetch(`/api/calculations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'hit-run',
            data: { ...formData, ...calculationResult },
          }),
        });
      } catch (err) {
        console.error('Failed to save calculation:', err);
      }
      setSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('HIT AND RUN COMPENSATION CALCULATOR', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 30, { align: 'right' });
    
    doc.setFontSize(12);
    doc.text('Case Details', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      body: [
        ['Case Number', result.caseNo || 'N/A'],
        ['Year', result.caseYear.toString()],
        ['Number of Deaths', result.deathCount.toString()],
        ['Driver Status', result.driverStatus],
        ['Compensation per Case', `₹${result.perCaseAmount.toLocaleString()}`],
        ['Total Compensation', `₹${result.totalCompensation.toLocaleString()}`]
      ],
      theme: 'grid'
    });
    
    doc.save('Hit_Run_Compensation.pdf');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 text-gray-600 hover:text-primary">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hit & Run Cases</h1>
              <p className="text-sm text-gray-500">Special compensation calculator</p>
            </div>
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
                  onChange={(e) => setFormData({...formData, caseYear: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Deaths</label>
              <input type="number" value={formData.deathCount}
                onChange={(e) => setFormData({...formData, deathCount: Math.max(1, parseInt(e.target.value) || 1)})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                min="1" />
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
                <br/>• Driver Identified: ₹5,00,000 per death
                <br/>• Driver Untraced: ₹2,50,000 per death
              </p>
            </div>

            <button onClick={calculateCompensation}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              <Calculator size={20} /> Calculate Compensation
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 space-y-6">
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-white">
              <h3 className="text-lg font-semibold mb-4">Compensation Result</h3>
              <div className="text-center">
                <p className="text-sm opacity-90">Total Compensation</p>
                <p className="text-5xl font-bold mt-2">₹{result.totalCompensation.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Breakdown</h3>
                <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
                  <Download size={18} /> PDF
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Driver Status</span>
                  <span className="font-semibold">{result.driverStatus}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Per Case Amount</span>
                  <span className="font-semibold">₹{result.perCaseAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Number of Deaths</span>
                  <span className="font-semibold">{result.deathCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-100 rounded-lg border-2 border-green-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-green-700 text-xl">₹{result.totalCompensation.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button onClick={() => { setFormData({...formData, caseNo: '', deathCount: 1, driverIdentified: false}); setResult(null); }}
              className="w-full py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2">
              <RefreshCw size={20} /> Reset
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
