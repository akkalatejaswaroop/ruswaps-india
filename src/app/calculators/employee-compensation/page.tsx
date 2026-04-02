"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowLeft,
  Calculator,
  Download,
  Briefcase,
  Calendar,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function EmployeeCompensationCalculator() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [claimType, setClaimType] = useState('fatal');
  const [formData, setFormData] = useState({
    caseNo: '',
    caseYear: new Date().getFullYear(),
    courtName: '',
    age: 30,
    monthlyWages: 20000,
    dependants: 2,
    disabilityPercentage: 0,
    otherExpenses: 0,
    interestRate: 6,
    days: 365
  });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // EC Act factors
  const getAgeFactor = (age) => {
    if (age <= 16) return 0.50;
    if (age <= 22) return 0.65;
    if (age <= 25) return 0.70;
    if (age <= 30) return 0.80;
    if (age <= 35) return 0.90;
    if (age <= 40) return 0.95;
    if (age <= 45) return 1.00;
    if (age <= 50) return 1.10;
    if (age <= 55) return 1.25;
    if (age <= 60) return 1.40;
    return 1.50;
  };

  const calculateCompensation = async () => {
    const ageFactor = getAgeFactor(formData.age);
    let calculationResult;
    
    if (claimType === 'fatal') {
      const lossOfFutureIncome = Math.round(((formData.monthlyWages * 50 / 100) * 12 * ageFactor));
      const totalCompensation = lossOfFutureIncome + Math.round(formData.otherExpenses);
      const interestAmount = Math.round(((totalCompensation * formData.interestRate) / 100) * (formData.days / 365));
      const totalWithInterest = totalCompensation + interestAmount;
      
      calculationResult = {
        type: 'Fatal',
        lossOfFutureIncome,
        otherExpenses: formData.otherExpenses,
        totalCompensation,
        interestRate: formData.interestRate,
        interestAmount,
        totalWithInterest,
        ageFactor
      };
    } else {
      const sixtyPercent = (formData.monthlyWages * 60) / 100;
      const disabilityDecimal = formData.disabilityPercentage / 100;
      const lossOfEarning = Math.round(sixtyPercent * disabilityDecimal * ageFactor * 12);
      const totalCompensation = lossOfEarning + Math.round(formData.otherExpenses);
      const interestAmount = Math.round(((totalCompensation * formData.interestRate) / 100) * (formData.days / 365));
      const totalWithInterest = totalCompensation + interestAmount;
      
      calculationResult = {
        type: 'Non-Fatal',
        lossOfEarning,
        disabilityPercentage: formData.disabilityPercentage,
        otherExpenses: formData.otherExpenses,
        totalCompensation,
        interestRate: formData.interestRate,
        interestAmount,
        totalWithInterest,
        ageFactor
      };
    }
    
    setResult(calculationResult);
    setStep(3);

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
            type: 'ec',
            data: { claimType, ...formData, ...calculationResult },
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
    doc.text('EMPLOYEE/WORKMEN COMPENSATION CLAIMS CALCULATOR', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 30, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Case Details', 14, 45);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: 50,
      head: [['Case No', 'Year', 'Court Name']],
      body: [[formData.caseNo || 'N/A', formData.caseYear, formData.courtName || 'N/A']],
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] }
    });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Claim Information', 14, 90);
    
    autoTable(doc, {
      startY: 95,
      head: [['Claim Type', 'Age', 'Monthly Wages']],
      body: [[claimType === 'fatal' ? 'Fatal/Death' : 'Non-Fatal/Injury', `${formData.age} years`, `₹${formData.monthlyWages.toLocaleString()}`]],
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] }
    });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Compensation Details', 14, 125);
    
    const detailsData = claimType === 'fatal' ? [
      ['Loss of Future Income (50%)', `₹${result?.lossOfFutureIncome?.toLocaleString()}`],
      ['Age Factor', result?.ageFactor?.toString()],
      ['Other Expenses', `₹${result?.otherExpenses?.toLocaleString()}`]
    ] : [
      ['Loss of Earning Capacity (60% × Disability%)', `₹${result?.lossOfEarning?.toLocaleString()}`],
      ['Disability Percentage', `${result?.disabilityPercentage}%`],
      ['Age Factor', result?.ageFactor?.toString()],
      ['Other Expenses', `₹${result?.otherExpenses?.toLocaleString()}`]
    ];
    
    autoTable(doc, {
      startY: 130,
      head: [['Description', 'Amount']],
      body: detailsData,
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] }
    });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Final Summary', 14, 175);
    
    autoTable(doc, {
      startY: 180,
      head: [['Component', 'Amount']],
      body: [
        ['Total Compensation', `₹${result?.totalCompensation?.toLocaleString()}`],
        ['Interest Rate', `${result?.interestRate}%`],
        ['Period (Days)', formData.days.toString()],
        ['Interest Amount', `₹${result?.interestAmount?.toLocaleString()}`],
        ['TOTAL WITH INTEREST', `₹${result?.totalWithInterest?.toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] },
      didParseCell: (data) => {
        if (data.row.index === 4) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [1, 124, 67];
        }
      }
    });
    
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('Generated by Ruswaps - EC Claims Calculator', 105, 270, { align: 'center' });
    doc.text('Under Workmen Compensation Act, 1923', 105, 275, { align: 'center' });
    
    doc.save('EC_Claims_Report.pdf');
  };

  const resetForm = () => {
    setStep(1);
    setClaimType('fatal');
    setFormData({
      caseNo: '',
      caseYear: new Date().getFullYear(),
      courtName: '',
      age: 30,
      monthlyWages: 20000,
      dependants: 2,
      disabilityPercentage: 0,
      otherExpenses: 0,
      interestRate: 6,
      days: 365
    });
    setResult(null);
  };

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
                <h1 className="text-xl font-bold text-gray-900">Employee Compensation</h1>
                <p className="text-sm text-gray-500">Workmen Compensation Act, 1923</p>
              </div>
            </div>
            {result && (
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Claim Type</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={() => setClaimType('fatal')}
                  className={`p-6 rounded-xl border-2 transition ${claimType === 'fatal' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                >
                  <Briefcase className="w-12 h-12 text-red-500 mb-4" />
                  <h3 className="text-lg font-bold">Fatal / Death</h3>
                  <p className="text-gray-600 text-sm mt-2">Death due to workplace accident</p>
                </button>
                <button
                  onClick={() => setClaimType('non-fatal')}
                  className={`p-6 rounded-xl border-2 transition ${claimType === 'non-fatal' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                >
                  <Briefcase className="w-12 h-12 text-orange-500 mb-4" />
                  <h3 className="text-lg font-bold">Non-Fatal / Injury</h3>
                  <p className="text-gray-600 text-sm mt-2">Injury causing disability</p>
                </button>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Enter Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Case Number</label>
                  <input type="text" value={formData.caseNo} onChange={(e) => setFormData({...formData, caseNo: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input type="number" value={formData.caseYear} onChange={(e) => setFormData({...formData, caseYear: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Court Name</label>
                  <input type="text" value={formData.courtName} onChange={(e) => setFormData({...formData, courtName: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age (Years)</label>
                  <input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  <p className="text-xs text-gray-500 mt-1">Age Factor: {getAgeFactor(formData.age)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Wages (₹)</label>
                  <input type="number" value={formData.monthlyWages} onChange={(e) => setFormData({...formData, monthlyWages: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {claimType === 'non-fatal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Disability Percentage (%)</label>
                    <input type="number" value={formData.disabilityPercentage} onChange={(e) => setFormData({...formData, disabilityPercentage: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" min="0" max="100" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Other Expenses (₹)</label>
                  <input type="number" value={formData.otherExpenses} onChange={(e) => setFormData({...formData, otherExpenses: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                  <input type="number" value={formData.interestRate} onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Days</label>
                  <input type="number" value={formData.days} onChange={(e) => setFormData({...formData, days: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold">Back</button>
              <button onClick={calculateCompensation} className="flex-1 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                <Calculator size={20} /> Calculate
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Results</h2>
                <button onClick={resetForm} className="flex items-center gap-2 text-gray-600 hover:text-primary">
                  <RefreshCw size={18} /> New
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white">
                  <p className="text-sm opacity-80">Total Compensation</p>
                  <p className="text-3xl font-bold mt-1">₹{result.totalCompensation.toLocaleString()}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-6">
                  <p className="text-sm text-gray-600">Interest</p>
                  <p className="text-2xl font-bold mt-1">₹{result.interestAmount.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 rounded-xl p-6">
                  <p className="text-sm text-green-700">Grand Total</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">₹{result.totalWithInterest.toLocaleString()}</p>
                </div>
              </div>
              <div className="border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600">Loss of Future Income</span><span className="font-semibold">₹{claimType === 'fatal' ? result.lossOfFutureIncome?.toLocaleString() : result.lossOfEarning?.toLocaleString()}</span></div>
                  {claimType === 'non-fatal' && <div className="flex justify-between"><span className="text-gray-600">Disability %</span><span className="font-semibold">{result.disabilityPercentage}%</span></div>}
                  <div className="flex justify-between"><span className="text-gray-600">Other Expenses</span><span className="font-semibold">₹{result.otherExpenses?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Interest Rate</span><span className="font-semibold">{result.interestRate}%</span></div>
                  <div className="flex justify-between bg-green-50 -mx-6 px-6 py-3 rounded-lg"><span className="font-bold">Total Interest</span><span className="font-bold text-green-700">₹{result.interestAmount.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold">Modify</button>
              <button onClick={generatePDF} className="flex-1 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
