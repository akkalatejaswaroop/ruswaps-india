import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <Link href="/" className="inline-flex items-center text-primary hover:text-primary-dark transition mb-8 font-medium">
          <ArrowLeft size={20} className="mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <BookOpen size={120} />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-8 border-b pb-6">Terms of Service</h1>
            
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Acceptance of Terms</h2>
                <p>By accessing and using the Ruswaps platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Description of Service</h2>
                <p>Ruswaps provides legal and financial calculation tools including Income Tax, MVA Claims, Employee Compensation, and Disability calculators. These tools are provided "as is" and are meant to assist professionals in estimating standard metrics.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">3. User Accounts</h2>
                <p>To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Ruswaps reserves the right to terminate accounts that violate our policies.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Intellectual Property</h2>
                <p>The platform, including its original content, features, calculators, and functionality, is owned by Ruswaps and is protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Limitation of Liability</h2>
                <p>Ruswaps shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Ensure to cross-verify all critical calculations with certified professionals.</p>
              </section>

              <div className="pt-8 mt-8 border-t border-gray-100 text-sm text-gray-500">
                Last updated: April 2026
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
