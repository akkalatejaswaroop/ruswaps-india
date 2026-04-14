"use client";
import Link from 'next/link';
import { Lock } from 'lucide-react';

const COMING_SOON_STATES = [
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Maharashtra',
  'Kerala',
  'Rajasthan',
  'Uttar Pradesh',
  'Gujarat',
  'West Bengal',
];

export default function ComingSoonStates() {
  return (
    <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-sm text-gray-600">
          Currently showing: <span className="font-medium text-gray-900">Andhra Pradesh</span>
        </span>
        <span className="hidden sm:inline text-gray-300">·</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Coming soon:</span>
          {COMING_SOON_STATES.map((state) => (
            <span
              key={state}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500"
              title="Coming soon"
            >
              <Lock size={10} />
              {state}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
