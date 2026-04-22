'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-zinc-300/80',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <div>
            <p className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}>
              {trend.value}
            </div>
          )}
        </div>
        <div className="rounded-xl bg-zinc-100 p-3 transition-colors group-hover:bg-zinc-200/80">
          <Icon className="h-5 w-5 text-zinc-600" />
        </div>
      </div>
    </div>
  );
}
