"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, RefreshCw } from 'lucide-react';

export default function AgeCalculator() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState('');
  const [result, setResult] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (!loggedIn) {
      router.push('/login');
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  const calculateAge = () => {
    if (!birthDate) return;
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const totalDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;
    const totalHours = totalDays * 24;
    const totalMinutes = totalHours * 60;
    const totalSeconds = totalMinutes * 60;
    
    setResult({
      years,
      months,
      days,
      totalDays,
      totalWeeks,
      totalMonths,
      totalHours,
      totalMinutes,
      totalSeconds
    });
  };

  const calculateFutureAge = (yearsToAdd) => {
    if (!birthDate) return '';
    const birth = new Date(birthDate);
    const future = new Date(birth);
    future.setFullYear(future.getFullYear() + yearsToAdd);
    return future.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
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
              <h1 className="text-xl font-bold text-gray-900">Age Calculator</h1>
              <p className="text-sm text-gray-500">Calculate exact age in various formats</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Enter Birth Date</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={calculateAge}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Calendar size={20} />
              Calculate Age
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 space-y-6">
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-white">
              <h3 className="text-lg font-semibold mb-4 opacity-90">Your Current Age</h3>
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">
                  {result.years} Years
                </div>
                <div className="text-2xl opacity-90">
                  {result.months} Months, {result.days} Days
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Age in Different Formats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Total Years</p>
                  <p className="text-2xl font-bold text-gray-900">{result.years}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Total Months</p>
                  <p className="text-2xl font-bold text-gray-900">{result.totalMonths}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Total Weeks</p>
                  <p className="text-2xl font-bold text-gray-900">{result.totalWeeks.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Total Days</p>
                  <p className="text-2xl font-bold text-gray-900">{result.totalDays.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{result.totalHours.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Total Minutes</p>
                  <p className="text-2xl font-bold text-gray-900">{result.totalMinutes.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Age Milestones</h3>
              <div className="space-y-3">
                {[18, 21, 25, 30, 40, 50, 60, 65, 70, 80].map(age => (
                  <div key={age} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Age {age} years</span>
                    <span className="font-semibold text-gray-900">{calculateFutureAge(age - result.years)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setBirthDate(''); setResult(null); }}
              className="w-full py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Reset
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
