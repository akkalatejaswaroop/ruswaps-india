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
  Truck,
  Briefcase,
  User,
  Calendar,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function MVAClaimsCalculator() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [claimType, setClaimType] = useState('fatal'); // fatal or non-fatal
  const [claimantType, setClaimantType] = useState('married'); // married, bachelor, minor
  const [formData, setFormData] = useState({
    caseNo: '',
    caseYear: new Date().getFullYear(),
    courtName: '',
    age: 30,
    income: 25000,
    dependents: 2,
    disabilityPercentage: 0,
    otherExpenses: 0,
    interestRate: 7,
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

  // Age factors based on Workers Compensation Act
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
      let multiplier = 1;
      if (claimantType === 'bachelor') multiplier = 0.80;
      else if (claimantType === 'minor') multiplier = 0.75;
      
      const lossOfDependency = (formData.income * 50 / 100) * 12 * ageFactor * multiplier;
      const funeralExpenses = 20000;
      const totalCompensation = Math.round(lossOfDependency) + Math.round(formData.otherExpenses) + funeralExpenses;
      
      const interestAmount = Math.round(((totalCompensation * formData.interestRate) / 100) * (formData.days / 365));
      const totalWithInterest = totalCompensation + interestAmount;
      
      calculationResult = {
        type: 'Fatal',
        lossOfDependency,
        funeralExpenses,
        otherExpenses: formData.otherExpenses,
        totalCompensation,
        interestRate: formData.interestRate,
        interestAmount,
        totalWithInterest,
        ageFactor
      };
    } else {
      const disabilityDecimal = formData.disabilityPercentage / 100;
      const lossOfEarningCapacity = (formData.income * 60 / 100) * disabilityDecimal * 12 * ageFactor;
      const totalCompensation = Math.round(lossOfEarningCapacity) + Math.round(formData.otherExpenses);
      
      const interestAmount = Math.round(((totalCompensation * formData.interestRate) / 100) * (formData.days / 365));
      const totalWithInterest = totalCompensation + interestAmount;
      
      calculationResult = {
        type: 'Non-Fatal',
        disabilityPercentage: formData.disabilityPercentage,
        lossOfEarningCapacity,
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
              ...calculationResult
            },
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
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MOTOR VEHICLE ACCIDENT CLAIMS CALCULATOR', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 30, { align: 'right' });
    
    // Case Details
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
    
    // Claim Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Claim Information', 14, 90);
    
    autoTable(doc, {
      startY: 95,
      head: [['Claim Type', 'Claimant Status', 'Age of Deceased/Injured']],
      body: [[claimType === 'fatal' ? 'Fatal/Death' : 'Non-Fatal/Injury', claimantType.toUpperCase(), `${formData.age} years`]],
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] }
    });
    
    // Financial Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Details', 14, 125);
    
    const financialData = claimType === 'fatal' ? [
      ['Monthly Income', `₹${formData.income.toLocaleString()}`],
      ['No. of Dependents', formData.dependents.toString()],
      ['Loss of Dependency (50%)', `₹${result?.lossOfDependency?.toLocaleString()}`],
      ['Funeral Expenses', `₹${result?.funeralExpenses?.toLocaleString()}`],
      ['Other Expenses', `₹${result?.otherExpenses?.toLocaleString()}`]
    ] : [
      ['Monthly Income', `₹${formData.income.toLocaleString()}`],
      ['Disability Percentage', `${formData.disabilityPercentage}%`],
      ['Loss of Earning Capacity (60%)', `₹${result?.lossOfEarningCapacity?.toLocaleString()}`],
      ['Other Expenses', `₹${result?.otherExpenses?.toLocaleString()}`]
    ];
    
    autoTable(doc, {
      startY: 130,
      head: [['Description', 'Amount']],
      body: financialData,
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] }
    });
    
    // Compensation Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Compensation Summary', 14, 185);
    
    autoTable(doc, {
      startY: 190,
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
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('Generated by Ruswaps - MVA-EC Claims Calculator', 105, 280, { align: 'center' });
    doc.text('This is a calculation aid. Actual compensation may vary based on court judgment.', 105, 285, { align: 'center' });
    
    doc.save('MVA_Claims_Report.pdf');
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
      days: 365
    });
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s < step ? 'bg-primary text-white' : s === step ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                <span className={`ml-2 font-medium ${s <= step ? 'text-primary' : 'text-gray-400'}`}>
                  {s === 1 ? 'Claim Type' : s === 2 ? 'Details' : 'Result'}
                </span>
                {s < 3 && <div className={`w-20 h-1 mx-4 ${s < step ? 'bg-primary' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Step 1: Claim Type Selection */}
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
                  <ul className="mt-4 text-sm text-gray-500 space-y-1">
                    <li>• Loss of dependency calculation</li>
                    <li>• Funeral expenses</li>
                    <li>• For married, bachelor, minor</li>
                  </ul>
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
                    <Briefcase className="text-orange-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Non-Fatal / Injury Claim</h3>
                  <p className="text-gray-600">For claims involving injuries</p>
                  <ul className="mt-4 text-sm text-gray-500 space-y-1">
                    <li>• Temporary or permanent disability</li>
                    <li>• Loss of earning capacity</li>
                    <li>• Based on disability percentage</li>
                  </ul>
                </button>
              </div>
            </div>

            {claimType === 'fatal' && (
              <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Select Claimant Status</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {['married', 'bachelor', 'minor'].map((type) => (
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

        {/* Step 2: Enter Details */}
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
                    onChange={(e) => setFormData({...formData, caseNo: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., MVC 1234/2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.caseYear}
                    onChange={(e) => setFormData({...formData, caseYear: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Court Name</label>
                  <input
                    type="text"
                    value={formData.courtName}
                    onChange={(e) => setFormData({...formData, courtName: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                    onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Age Factor: {getAgeFactor(formData.age)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Income (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.income}
                    onChange={(e) => setFormData({...formData, income: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {claimType === 'fatal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Dependents</label>
                    <input
                      type="number"
                      value={formData.dependents}
                      onChange={(e) => setFormData({...formData, dependents: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      min="0"
                    />
                  </div>
                )}

                {claimType === 'non-fatal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Disability Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={formData.disabilityPercentage}
                      onChange={(e) => setFormData({...formData, disabilityPercentage: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      min="0"
                      max="100"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Other Expenses (₹)</label>
                  <input
                    type="number"
                    value={formData.otherExpenses}
                    onChange={(e) => setFormData({...formData, otherExpenses: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
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
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={calculateCompensation}
                className="flex-1 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Calculator size={20} />
                Calculate Compensation
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && result && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Calculation Results</h2>
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 text-gray-600 hover:text-primary"
                >
                  <RefreshCw size={18} />
                  New Calculation
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white">
                  <p className="text-sm opacity-80">Total Compensation</p>
                  <p className="text-3xl font-bold mt-1">₹{result.totalCompensation.toLocaleString()}</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-6">
                  <p className="text-sm text-gray-600">Interest Amount</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{result.interestAmount.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 rounded-xl p-6">
                  <p className="text-sm text-green-700">Total with Interest</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">₹{result.totalWithInterest.toLocaleString()}</p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h3 className="font-semibold text-gray-900">Detailed Breakdown</h3>
                </div>
                <div className="p-6 space-y-4">
                  {claimType === 'fatal' ? (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Loss of Dependency (50% of Income × 12 × Age Factor)</span>
                        <span className="font-semibold">₹{result.lossOfDependency?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Funeral Expenses</span>
                        <span className="font-semibold">₹{result.funeralExpenses?.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Loss of Earning Capacity (60% × Disability %)</span>
                        <span className="font-semibold">₹{result.lossOfEarningCapacity?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Disability Percentage</span>
                        <span className="font-semibold">{result.disabilityPercentage}%</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Other Expenses</span>
                    <span className="font-semibold">₹{result.otherExpenses?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Interest Rate</span>
                    <span className="font-semibold">{result.interestRate}%</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Period (Days)</span>
                    <span className="font-semibold">{formData.days}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-lg">
                    <span className="font-bold text-gray-900">Total Interest</span>
                    <span className="font-bold text-green-700">₹{result.interestAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Formula */}
              <div className="mt-6 bg-blue-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Calculation Formula</h4>
                <p className="text-sm text-gray-600 font-mono">
                  {claimType === 'fatal' 
                    ? 'Loss of Dependency = (Monthly Income × 50%) × 12 months × Age Factor'
                    : 'Loss of Earning = (Monthly Income × 60%) × Disability% × 12 months × Age Factor'
                  }
                </p>
                <p className="text-sm text-gray-600 font-mono mt-2">
                  Total = Compensation + Other Expenses
                </p>
                <p className="text-sm text-gray-600 font-mono">
                  Interest = (Total × Interest Rate%) × (Days / 365)
                </p>
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
                Download PDF Report
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
