'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate, getAgingBucket, getAgingColor } from '@/lib/utils';
import { Plus, Search, Receipt, Download } from 'lucide-react';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchInvoices = useCallback(async () => {
    const params = new URLSearchParams({ search, status: statusFilter, type: typeFilter });
    const res = await fetch(`/api/invoices?${params}`);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return (
    <>
      <PageHeader title="Invoices" description="Tax invoices and credit notes">
        <Button variant="outline" onClick={() => window.open('/api/export?type=invoices', '_blank')}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
        <Button onClick={() => router.push('/invoices/new')}>
          <Plus className="h-4 w-4 mr-2" /> New Invoice
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text" placeholder="Search invoice # or customer..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400" />
        </div>
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Types' }, { value: 'invoice', label: 'Invoices' }, { value: 'credit_note', label: 'Credit Notes' }]} />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Status' }, { value: 'open', label: 'Open' }, { value: 'partially_paid', label: 'Partially Paid' }, { value: 'paid', label: 'Paid' }, { value: 'cancelled', label: 'Cancelled' }]} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-zinc-400">Loading...</div></div>
      ) : invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices found" description="Create your first invoice to get started." action={{ label: 'New Invoice', onClick: () => router.push('/invoices/new') }} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Aging</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map(inv => {
              const isCN = inv.document_type === 'credit_note';
              const aging = inv.status === 'paid' || inv.status === 'cancelled' || isCN
                ? { label: inv.status === 'paid' ? 'Paid' : isCN ? 'CN' : 'Cancelled', color: 'gray' }
                : getAgingBucket(inv.due_date);
              return (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${inv.id}`)}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>
                    <Badge variant={isCN ? 'info' : 'default'}>{isCN ? 'Credit Note' : 'Invoice'}</Badge>
                  </TableCell>
                  <TableCell>{inv.customer_name}</TableCell>
                  <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getAgingColor(aging.color)}`}>
                      {aging.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                  <TableCell className="text-right">{isCN ? '—' : formatCurrency(inv.paid_amount || 0)}</TableCell>
                  <TableCell className="text-right font-medium">{isCN ? '—' : formatCurrency(inv.outstanding_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      inv.status === 'paid' ? 'success' :
                      inv.status === 'partially_paid' ? 'warning' :
                      inv.status === 'cancelled' ? 'danger' : 'default'
                    }>{inv.status.replace('_', ' ')}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
