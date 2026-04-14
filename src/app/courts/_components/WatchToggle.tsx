"use client";
import { useState } from 'react';
import { Star } from 'lucide-react';

interface WatchToggleProps {
  cnrNumber: string;
  isWatching: boolean;
  onWatchChange?: (cnrNumber: string, nowWatching: boolean) => void;
}

export default function WatchToggle({ cnrNumber, isWatching: initialIsWatching, onWatchChange }: WatchToggleProps) {
  const [isWatching, setIsWatching] = useState(initialIsWatching);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isWatching) {
        const res = await fetch('/api/courts/watch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cnrNumber }),
        });
        if (res.ok) {
          setIsWatching(false);
          onWatchChange?.(cnrNumber, false);
        }
      } else {
        const res = await fetch('/api/courts/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cnrNumber }),
        });
        if (res.ok) {
          setIsWatching(true);
          onWatchChange?.(cnrNumber, true);
        }
      }
    } catch (err) {
      console.error('Watch toggle error:', err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-lg transition ${
        isWatching
          ? 'text-amber-500 hover:bg-amber-50'
          : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
      }`}
      title={isWatching ? 'Stop watching' : 'Watch this case'}
    >
      <Star size={20} fill={isWatching ? 'currentColor' : 'none'} />
    </button>
  );
}