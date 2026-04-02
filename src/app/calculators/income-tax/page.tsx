"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Calculator, Download, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function IncomeTaxInterestCalculator() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    awardAmount: 100000,
    interestRate: 7,
    days: 180,
    hasPAN: true
  });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const calculateInterest = async () => {
    const interestAmount = (formData.awardAmount * formData.interestRate * formData.days) / (100 * 365);
    
    let tdsRate = 0;
    let tdsAmount = 0;
    
    if (formData.hasPAN) {
      if (interestAmount > 10000) {
        tdsRate = 10;
        tdsAmount = interestAmount * 0.1;
      }
    } else {
      tdsRate = 20;
      tdsAmount = interestAmount * 0.2;
    }
    
    const netPayable = interestAmount - tdsAmount;
    const tdsApplicable = interestAmount > 10000 || !formData.hasPAN;
    
    const calculationResult = {
      awardAmount: formData.awardAmount,
      interestRate: formData.interestRate,
      days: formData.days,
      interestAmount: Math.round(interestAmount),
      tdsRate,
      tdsAmount: Math.round(tdsAmount),
      netPayable: Math.round(netPayable),
      hasPAN: formData.hasPAN,
      tdsApplicable
    };
    
    setResult(calculationResult);

    const token = localStorage.getItem('accessToken');
    if (token) {
      setSaving(true);
      try {
        await fetch(`${API_URL}/api/calculations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'income-tax',
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
    doc.text('INCOME TAX ON INTEREST CALCULATOR', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 30, { align: 'right' });
    
    autoTable(doc, {
      startY: 40,
      head: [['Description', 'Amount']],
      body: [
        ['Award Amount', `₹${result.awardAmount.toLocaleString()}`],
        ['Interest Rate', `${result.interestRate}%`],
        ['Period (Days)', result.days.toString()],
        ['Gross Interest', `₹${result.interestAmount.toLocaleString()}`],
        ['PAN Available', result.hasPAN ? 'Yes' : 'No'],
        ['TDS Rate', `${result.tdsRate}%`],
        ['TDS Amount', `₹${result.tdsAmount.toLocaleString()}`],
        ['Net Interest Payable', `₹${result.netPayable.toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] }
    });
    
    doc.save('Interest_Tax_Calculation.pdf');
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
              <h1 className="text-xl font-bold text-gray-900">Income Tax on Interest</h1>
              <p className="text-sm text-gray-500">Calculate TDS on interest</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Enter Details</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Award Amount (₹)</label>
              <input
                type="number"
                value={formData.awardAmount}
                onChange={(e) => setFormData({...formData, awardAmount: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
              <input
                type="number"
                value={formData.interestRate}
                onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Days</label>
              <input
                type="number"
                value={formData.days}
                onChange={(e) => setFormData({...formData, days: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
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

            <button
              onClick={calculateInterest}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Calculator size={20} />
              Calculate Interest
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Calculation Results</h2>
                <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
                  <Download size={18} /> Download PDF
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Award Amount</span>
                  <span className="font-bold text-lg">₹{result.awardAmount.toLocaleString()}</span>
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
                  <span className="font-bold text-xl text-yellow-800">₹{result.interestAmount.toLocaleString()}</span>
                </div>
                
                {result.tdsApplicable && (
                  <>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                      <span className="text-red-700">TDS Rate ({result.hasPAN ? 'With PAN' : 'Without PAN'})</span>
                      <span className="font-bold text-lg text-red-700">{result.tdsRate}%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                      <span className="text-red-700">TDS Amount</span>
                      <span className="font-bold text-lg text-red-700">₹{result.tdsAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center p-4 bg-green-100 rounded-xl border-2 border-green-300">
                  <span className="text-green-800 font-bold">Net Interest Payable</span>
                  <span className="font-bold text-2xl text-green-800">₹{result.netPayable.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-2">Important Notes</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• TDS is deducted under Section 194A of Income Tax Act</li>
                  <li>• With PAN: TDS @10% if interest exceeds ₹10,000</li>
                  <li>• Without PAN: TDS @20% (higher rate)</li>
                  <li>• TDS certificate (Form 16A) can be downloaded from TRACES</li>
                </ul>
              </div>

              <button
                onClick={() => { setFormData({...formData, awardAmount: 100000, interestRate: 7, days: 180, hasPAN: true}); setResult(null); }}
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
