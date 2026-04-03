import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <Link href="/" className="inline-flex items-center text-primary hover:text-primary-dark transition mb-8 font-medium">
          <ArrowLeft size={20} className="mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Shield size={120} />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-8 border-b pb-6">Privacy Policy</h1>
            
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Information We Collect</h2>
                <p>We collect information that you explicitly provide to us when you create an account, such as your name, email address, and phone number. We also collect calculation query data that is submitted through our calculators securely to improve your workflow experiences.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">2. How We Use Your Information</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To provide and maintain the Ruswaps platform and calculators</li>
                  <li>To authenticate the security of your account with OTP logins</li>
                  <li>To deliver important service updates and notifications</li>
                  <li>To understand how users engage with our platform to improve our features</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Data Security and Storage</h2>
                <p>We implement strict security methodologies and enterprise-grade encryption to protect your personal information against unauthorized access, alteration, disclosure, or destruction. We do not sell your data to third-party ad networks or data brokers.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Cookies and Tracking</h2>
                <p>Ruswaps uses essential browser cookies and local storage tokens strictly to maintain your session and ensure you remain logged in seamlessly between pages. We do not employ cross-site tracking cookies.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Contact Us</h2>
                <p>If you have any questions or concerns about this Privacy Policy, please contact our support team. We take all privacy requests seriously and will respond promptly.</p>
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
