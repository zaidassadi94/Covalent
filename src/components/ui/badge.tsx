'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
        {
          'bg-zinc-100 text-zinc-700 ring-zinc-600/20': variant === 'default',
          'bg-emerald-50 text-emerald-700 ring-emerald-600/20': variant === 'success',
          'bg-amber-50 text-amber-700 ring-amber-600/20': variant === 'warning',
          'bg-red-50 text-red-700 ring-red-600/20': variant === 'danger',
          'bg-sky-50 text-sky-700 ring-sky-600/20': variant === 'info',
          'bg-transparent text-zinc-600 ring-zinc-300': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
