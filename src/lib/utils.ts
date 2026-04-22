import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function getToday(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAgingBucket(dueDate: string): { label: string; color: string; days: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOverdue < 0) {
    return { label: `Due in ${Math.abs(daysOverdue)}d`, color: 'emerald', days: daysOverdue };
  }
  if (daysOverdue <= 30) {
    return { label: `${daysOverdue}d overdue`, color: 'amber', days: daysOverdue };
  }
  if (daysOverdue <= 60) {
    return { label: `${daysOverdue}d overdue`, color: 'orange', days: daysOverdue };
  }
  return { label: `${daysOverdue}d overdue`, color: 'red', days: daysOverdue };
}

export function getAgingColor(color: string): string {
  switch (color) {
    case 'emerald': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case 'amber': return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    case 'orange': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
    case 'red': return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'gray': return 'bg-zinc-50 text-zinc-600 ring-zinc-500/20';
    default: return 'bg-zinc-50 text-zinc-600 ring-zinc-500/20';
  }
}
