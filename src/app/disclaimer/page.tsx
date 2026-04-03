import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <Link href="/" className="inline-flex items-center text-primary hover:text-primary-dark transition mb-8 font-medium">
          <ArrowLeft size={20} className="mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-amber-500">
            <AlertTriangle size={120} />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-8 border-b pb-6">Legal Disclaimer</h1>
            
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Informational Purposes Only</h2>
                <p>The calculators, tools, and all associated content provided on the Ruswaps platform are intended for strictly informational and estimate purposes only. Nothing on this website should be construed as formal, certified legal, financial, or tax advice.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Accuracy of Calculations</h2>
                <p>While we strive to keep the software logic accurate and completely up-to-date with current legal brackets and compensation frameworks, laws and policies change frequently. Ruswaps makes no representations, warranties, or guarantees—express or implied—regarding the complete accuracy, reliability, or applicability of the calculated results in a court of law or professional audit.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Professional Consultation Recommended</h2>
                <p>Users should not act or rely exclusively on the information provided by these calculators without seeking the advice of a competent, licensed attorney, certified public accountant, or authorized financial consultant in their specific jurisdiction.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">No Attorney-Client Relationship</h2>
                <p>Use of the Ruswaps platform does not establish an attorney-client or professional-client relationship. All reliance upon the materials provided on this platform is solely at your own risk.</p>
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
