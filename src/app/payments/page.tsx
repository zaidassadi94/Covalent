'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, CreditCard, Download } from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchPayments = useCallback(async () => {
    const params = new URLSearchParams({ search, method: methodFilter });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const res = await fetch(`/api/payments?${params}`);
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  }, [search, methodFilter, dateFrom, dateTo]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment? The invoice outstanding will be restored.')) return;
    await fetch(`/api/payments/${id}`, { method: 'DELETE' });
    fetchPayments();
  };

  return (
    <>
      <PageHeader title="Payments" description="Payment records across all invoices">
        <Button variant="outline" onClick={() => window.open('/api/export?type=payments', '_blank')}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text" placeholder="Search invoice, customer, or reference..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400" />
        </div>
        <Select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Methods' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'cheque', label: 'Cheque' }, { value: 'cash', label: 'Cash' }, { value: 'other', label: 'Other' }]} />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-zinc-400">Loading...</div></div>
      ) : payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments found" description="Payments are recorded from individual invoice pages." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(p => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.payment_date)}</TableCell>
                <TableCell className="font-medium cursor-pointer text-zinc-900 hover:text-zinc-600" onClick={() => router.push(`/invoices/${p.invoice_id}`)}>{p.invoice_number}</TableCell>
                <TableCell>{p.customer_name}</TableCell>
                <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                <TableCell>{p.reference || '—'}</TableCell>
                <TableCell>{p.banking_name || '—'}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(p.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
