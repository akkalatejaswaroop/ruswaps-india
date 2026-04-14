import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  depth?: boolean;
  hover?: boolean;
}

export function PremiumCard({
  children,
  className,
  glass = true,
  depth = true,
  hover = true,
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        glass && 'premium-glass',
        depth && 'premium-depth',
        hover && 'card-hover',
        className
      )}
    >
      {children}
    </div>
  );
}

export function PremiumBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20',
        className
      )}
    >
      {children}
    </span>
  );
}
