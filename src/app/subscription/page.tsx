"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Shield,
  Zap,
  Download,
  Users
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Plan {
  name: string;
  price: number;
  period: string;
  savings?: string;
  features: string[];
}

export default function Subscription() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/user/profile`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setUser(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  const plans: Record<string, Plan> = {
    monthly: {
      name: 'Monthly',
      price: 299,
      period: 'month',
      features: [
        'All Calculators',
        'PDF Export',
        'Case Direction',
        'Email Support'
      ]
    },
    annual: {
      name: 'Annual',
      price: 1999,
      period: 'year',
      savings: '40%',
      features: [
        'All Calculators',
        'PDF Export',
        'Case Direction',
        'Priority Support',
        'Latest Updates',
        'All Legal Documents'
      ]
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    const token = localStorage.getItem('accessToken');
    
    try {
      const response = await fetch(`${API_URL}/api/payments/razorpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: plans[selectedPlan].price,
          plan: selectedPlan,
        }),
      });

      const data = await response.json();

      if (data.success && data.data.keyId) {
        const razorpayOptions = {
          key: data.data.keyId,
          amount: data.data.amount,
          currency: data.data.currency,
          name: 'Ruswaps',
          description: `${plans[selectedPlan].name} Subscription`,
          order_id: data.data.orderId,
          handler: async (response) => {
            const verifyResponse = await fetch(`${API_URL}/api/payments/razorpay`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              const updatedUser = { ...user, isSubscribed: true, subscriptionExpiry: verifyData.data.subscriptionExpiry };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
              alert('Payment successful! Your subscription is now active.');
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: {
            color: '#017c43',
          },
        };

        if (typeof window !== 'undefined' && window.Razorpay) {
          const razorpay = new window.Razorpay(razorpayOptions);
          razorpay.open();
        } else {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => {
            if (window.Razorpay) {
              const razorpay = new window.Razorpay(razorpayOptions);
              razorpay.open();
            }
          };
          document.body.appendChild(script);
        }
      } else {
        alert('Failed to create order. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed. Please try again.');
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 text-gray-600 hover:text-primary">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Subscription</h1>
              <p className="text-sm text-gray-500">Choose your plan</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Unlock All Features</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get unlimited access to all calculators, PDF exports, case management, and premium features.
          </p>
        </div>

        {user?.isSubscribed ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="text-white" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Subscription Active</h3>
                <p className="text-sm text-gray-600">
                  Your subscription is valid until {user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Upgrade to Premium</h3>
                <p className="text-sm text-gray-600">Unlock all features by subscribing today</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className={`bg-white rounded-2xl p-8 border-2 cursor-pointer transition ${
                selectedPlan === key ? 'border-primary shadow-lg' : 'border-gray-200'
              }`}
              onClick={() => setSelectedPlan(key)}
            >
              {plan.savings && (
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full mb-4">
                  Save {plan.savings}
                </span>
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-primary">₹{plan.price}</span>
                <span className="text-gray-500">/{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="text-green-500 flex-shrink-0" size={18} />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => selectedPlan === key && !user?.isSubscribed && handlePayment()}
                disabled={processing || user?.isSubscribed}
                className={`w-full py-4 rounded-xl font-semibold transition ${
                  selectedPlan === key && !user?.isSubscribed
                    ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {processing ? 'Processing...' : user?.isSubscribed ? 'Current Plan' : selectedPlan === key ? 'Subscribe Now' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">What's Included</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="text-primary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">All Calculators</h4>
                <p className="text-sm text-gray-600">MVA Claims, EC Claims, Disability, Age, Income Tax & more</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="text-secondary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">PDF Export</h4>
                <p className="text-sm text-gray-600">Download professional reports for court submission</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="text-primary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Case Direction</h4>
                <p className="text-sm text-gray-600">Track cases, hearings, and generate reports</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="text-secondary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Legal Documents</h4>
                <p className="text-sm text-gray-600">Access Vakalatnama, Legal Dictionary, Acts</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
