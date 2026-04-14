import Link from 'next/link';
import { ArrowLeft, FileSearch } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-md w-full text-center">
        <FileSearch size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Case Not Found</h1>
        <p className="text-gray-500 mb-6">
          This CNR number doesn&apos;t exist in our database yet.
        </p>
        <Link
          href="/courts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          <ArrowLeft size={18} />
          Back to eCourts Cases
        </Link>
      </div>
    </div>
  );
}
