"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Truck,
  Briefcase,
  Scale,
  CreditCard,
  Calendar,
  AlertTriangle,
  FileText,
  BookOpen,
  Shield,
  Users,
  Download,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Check
} from 'lucide-react';


const features = [
  { name: 'Motor Vehicle Accident Claims', icon: Truck, href: '/calculators/mva-claims', color: 'primary' },
  { name: 'Employee Compensation', icon: Briefcase, href: '/calculators/employee-compensation', color: 'secondary' },
  { name: 'Disability Calculator', icon: Scale, href: '/calculators/disability', color: 'primary' },
  { name: 'Income Tax on Interest', icon: CreditCard, href: '/calculators/income-tax', color: 'secondary' },
  { name: 'Age Calculator', icon: Calendar, href: '/calculators/age', color: 'primary' },
  { name: 'Hit & Run Cases', icon: AlertTriangle, href: '/calculators/hit-run', color: 'secondary' },
];

const documents = [
  { name: 'Vakalatnama', icon: FileText, href: '/documents/vakalatnama' },
  { name: 'Legal Dictionary', icon: BookOpen, href: '/documents/dictionary' },
  { name: 'Provisions in Accident Claims', icon: Shield, href: '/documents/provisions' },
  { name: 'Motor Vehicle Act', icon: Users, href: '/documents/mv-act' },
  { name: 'Employee Compensation Act', icon: Briefcase, href: '/documents/ec-act' },
  { name: 'WS Documents', icon: Download, href: '/documents/ws' },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`/api/user/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setUser(data.data);
          localStorage.setItem('user', JSON.stringify(data.data));
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          localStorage.removeItem('isLoggedIn');
          router.push('/login');
        }
      } catch (err) {
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    router.push('/');
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
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:text-primary lg:hidden">
                <Menu size={24} />
              </button>
              <Link href="/dashboard" className="flex items-center gap-2 ml-2 lg:ml-0">
                <Image src="/logo.png" alt="Ruswaps" width={64} height={64} className="w-16 h-16 object-contain" />
                <Image src="/main_logo.jpg" alt="Ruswaps" width={200} height={56} className="hidden lg:block h-14 w-auto object-contain" />
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-600 hover:text-primary">
                <Bell size={24} />
              </button>
              <Link href="/subscription" className="hidden sm:block px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-sm font-medium hover:opacity-90">
                Upgrade
              </Link>
              <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-red-600">
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}!</h1>
          <p className="text-gray-600">Access all legal calculators and documents</p>
        </div>

        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Premium Plan</h2>
              <p className="text-white/80 text-sm">
                {user?.isSubscribed 
                  ? `Valid until ${new Date(user.subscriptionExpiry).toLocaleDateString('en-IN')}`
                  : 'Upgrade to access all features'}
              </p>
            </div>
            {!user?.isSubscribed && (
              <Link href="/subscription" className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100">
                Upgrade Now
              </Link>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Calculators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Link key={feature.name} href={feature.href} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition card-hover">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  feature.color === 'primary' ? 'bg-primary/10' : 'bg-secondary/10'
                }`}>
                  <feature.icon className={feature.color === 'primary' ? 'text-primary' : 'text-secondary'} size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">{feature.name}</h3>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Legal Documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Link key={doc.name} href={doc.href} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition card-hover">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  <doc.icon className="text-gray-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">{doc.name}</h3>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <Link href="/case-direction" className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Case Direction</h3>
                <p className="text-gray-500 text-sm">Track and manage your cases</p>
              </div>
            </div>
            <ChevronRight className="text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
