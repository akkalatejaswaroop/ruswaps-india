"use client";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1); // 1: Email, 2: OTP & New Password
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', otp: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('OTP sent to your email successfully.');
        setStep(2);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Unable to connect to server');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/forgot-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successfully. Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Unable to connect to server');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center text-gray-600 hover:text-primary mb-4 transition-colors">
            <ArrowLeft size={20} className="mr-2" /> Back to Login
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.png" alt="Ruswaps" width={96} height={96} className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 mt-2">
            {step === 1 ? 'Enter your registered email to receive an OTP' : 'Enter the OTP and your new password'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">OTP Received</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={formData.otp}
                    onChange={(e) => setFormData({...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center tracking-widest text-lg font-bold"
                    placeholder="• • • •"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter new password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="text-center mt-6 text-gray-600">
            Remembered your password?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
