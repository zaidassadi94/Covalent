'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart3, Users, AlertTriangle, DollarSign, Search, Download } from 'lucide-react';

export default function StatementsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerStatement, setCustomerStatement] = useState<any>(null);
  const [showStatement, setShowStatement] = useState(false);

  useEffect(() => {
    fetch('/api/statements')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  const viewStatement = async (customerId: string) => {
    const res = await fetch(`/api/statements?customer_id=${customerId}`);
    const d = await res.json();
    setCustomerStatement(d);
    setShowStatement(true);
  };

  const filteredCustomers = (data?.customers || []).filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.account_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-zinc-400">Loading...</div></div>;

  const totals = data?.totals || {};

  return (
    <>
      <PageHeader title="Statement of Accounts" description="Receivables aging and customer balances">
        <Button variant="outline" onClick={() => window.open('/api/export?type=invoices', '_blank')}>
          <Download className="h-4 w-4 mr-2" /> Aging Report
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <StatCard title="Customers with Balance" value={String(totals.customerCount || 0)} icon={Users} />
        <StatCard title="Total Outstanding" value={formatCurrency(totals.totalOutstanding || 0)} icon={DollarSign} />
        <StatCard title="Current (Not Due)" value={formatCurrency(totals.current || 0)} icon={BarChart3} />
        <StatCard title="Total Overdue" value={formatCurrency(totals.overdue || 0)} icon={AlertTriangle} />
      </div>

      {/* Aging breakdown */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-6 gap-4">
            {[
              { label: 'Current', value: totals.current, color: 'bg-emerald-500' },
              { label: '1-30 Days', value: totals.bucket_1_30, color: 'bg-amber-500' },
              { label: '31-60 Days', value: totals.bucket_31_60, color: 'bg-orange-500' },
              { label: '61-90 Days', value: totals.bucket_61_90, color: 'bg-red-500' },
              { label: '90+ Days', value: totals.bucket_90_plus, color: 'bg-red-800' },
              { label: 'Total', value: totals.totalOutstanding, color: 'bg-zinc-900' },
            ].map((b, i) => (
              <div key={i} className="text-center">
                <div className={`h-1.5 rounded-full ${b.color} mb-2`} />
                <p className="text-xs font-medium text-zinc-500">{b.label}</p>
                <p className="text-sm font-bold text-zinc-900">{formatCurrency(b.value || 0)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400" />
        </div>
      </div>

      {/* Customer aging table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Sales Rep</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">1-30</TableHead>
            <TableHead className="text-right">31-60</TableHead>
            <TableHead className="text-right">61-90</TableHead>
            <TableHead className="text-right">90+</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCustomers.length === 0 ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-zinc-400">No outstanding balances</TableCell></TableRow>
          ) : filteredCustomers.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.account_number}</TableCell>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.sales_rep_name || '—'}</TableCell>
              <TableCell className="text-right">{c.current_amount > 0 ? formatCurrency(c.current_amount) : '—'}</TableCell>
              <TableCell className="text-right">{c.bucket_1_30 > 0 ? formatCurrency(c.bucket_1_30) : '—'}</TableCell>
              <TableCell className="text-right">{c.bucket_31_60 > 0 ? formatCurrency(c.bucket_31_60) : '—'}</TableCell>
              <TableCell className="text-right">{c.bucket_61_90 > 0 ? formatCurrency(c.bucket_61_90) : '—'}</TableCell>
              <TableCell className="text-right">{c.bucket_90_plus > 0 ? formatCurrency(c.bucket_90_plus) : '—'}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(c.total_outstanding)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => viewStatement(c.id)}>View</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Statement Modal */}
      <Modal open={showStatement} onClose={() => setShowStatement(false)} title={`Statement — ${customerStatement?.customer?.name || ''}`} size="full">
        {customerStatement && (
          <>
            <div className="flex items-center justify-between py-4 border-b border-zinc-100 mb-4">
              <div>
                <p className="text-sm text-zinc-500">{customerStatement.customer.account_number} · {customerStatement.customer.address}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Total Outstanding</p>
                <p className="text-xl font-bold text-zinc-900">{formatCurrency(customerStatement.totalOutstanding)}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Document #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(customerStatement.statement || []).map((entry: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="font-medium">{entry.doc_number}</TableCell>
                    <TableCell className="capitalize">{entry.type === 'credit_note' ? 'Credit Note' : entry.type}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">{entry.debit > 0 ? formatCurrency(entry.debit) : '—'}</TableCell>
                    <TableCell className="text-right text-emerald-600">{entry.credit > 0 ? formatCurrency(entry.credit) : '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Modal>
    </>
  );
}
