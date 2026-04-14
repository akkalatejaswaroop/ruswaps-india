/**
 * Premium Command Palette for quick navigation.
 */
"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Calculator, 
  FileText, 
  Settings, 
  User, 
  LogOut,
  Command,
  X,
  Truck,
  Scale,
  CreditCard,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands = [
    { title: 'Dashboard', icon: Command, group: 'Navigation', href: '/dashboard' },
    { title: 'Profile Settings', icon: User, group: 'Account', href: '/profile' },
    { title: 'MVA Calculator', icon: Truck, group: 'Calculators', href: '/calculators/mva-claims' },
    { title: 'Disability Calculator', icon: Scale, group: 'Calculators', href: '/calculators/disability' },
    { title: 'Employee Compensation', icon: Briefcase, group: 'Calculators', href: '/calculators/employee-compensation' },
    { title: 'Income Tax Calc', icon: CreditCard, group: 'Calculators', href: '/calculators/income-tax' },
    { title: 'Legal Dictionary', icon: FileText, group: 'Documents', href: '/documents/dictionary' },
    { title: 'Vakalatnama', icon: FileText, group: 'Documents', href: '/documents/vakalatnama' },
    { title: 'Court Search', icon: Scale, group: 'eCourts', href: '/courts' },
  ];

  const filtered = commands.filter(c => 
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.group.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setActiveIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-center px-4 py-4 border-b border-gray-100 dark:border-slate-800">
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % filtered.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
              } else if (e.key === 'Enter' && filtered[activeIndex]) {
                handleSelect(filtered[activeIndex].href);
              }
            }}
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs text-gray-400 border border-gray-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length > 0 ? (
            <div className="space-y-1">
              {(() => {
                let currentGroup = '';
                return filtered.map((cmd, idx) => {
                  const showGroup = cmd.group !== currentGroup;
                  currentGroup = cmd.group;
                  return (
                    <div key={cmd.title}>
                      {showGroup && (
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {cmd.group}
                        </div>
                      )}
                      <div
                        onClick={() => handleSelect(cmd.href)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                          idx === activeIndex 
                            ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <cmd.icon size={18} className="mr-3" />
                        <span className="font-medium">{cmd.title}</span>
                        {idx === activeIndex && (
                          <span className="ml-auto text-xs opacity-60">Enter</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-gray-400">
              No results found for "{query}"
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded">↑↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded">↵</kbd> to select</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
