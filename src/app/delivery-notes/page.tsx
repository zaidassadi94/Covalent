'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import { Plus, Search, FileText } from 'lucide-react';

export default function DeliveryNotesPage() {
  const router = useRouter();
  const [dns, setDns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDns = useCallback(async () => {
    const params = new URLSearchParams({ search, status: statusFilter });
    const res = await fetch(`/api/delivery-notes?${params}`);
    const data = await res.json();
    setDns(data.deliveryNotes || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchDns(); }, [fetchDns]);

  return (
    <>
      <PageHeader title="Delivery Notes" description="Manage dispatch documents">
        <Button onClick={() => router.push('/delivery-notes/new')}>
          <Plus className="h-4 w-4 mr-2" /> New Delivery Note
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text" placeholder="Search DN # or customer..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400" />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Status' }, { value: 'draft', label: 'Draft' }, { value: 'dispatched', label: 'Dispatched' }, { value: 'invoiced', label: 'Invoiced' }, { value: 'cancelled', label: 'Cancelled' }]} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-zinc-400">Loading...</div></div>
      ) : dns.length === 0 ? (
        <EmptyState icon={FileText} title="No delivery notes" description="Create your first delivery note to dispatch goods." action={{ label: 'New Delivery Note', onClick: () => router.push('/delivery-notes/new') }} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DN #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Dispatch Date</TableHead>
              <TableHead>PO #</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Weight (Kg)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dns.map(dn => (
              <TableRow key={dn.id} className="cursor-pointer" onClick={() => router.push(`/delivery-notes/${dn.id}`)}>
                <TableCell className="font-medium">{dn.dn_number}</TableCell>
                <TableCell>{dn.customer_name}</TableCell>
                <TableCell>{formatDate(dn.dispatch_date)}</TableCell>
                <TableCell>{dn.purchase_order_number}</TableCell>
                <TableCell className="text-right">{dn.total_units}</TableCell>
                <TableCell className="text-right">{Number(dn.total_weight).toLocaleString('en-US', { maximumFractionDigits: 1 })}</TableCell>
                <TableCell>
                  <Badge variant={
                    dn.status === 'invoiced' ? 'success' :
                    dn.status === 'dispatched' ? 'warning' :
                    dn.status === 'cancelled' ? 'danger' : 'default'
                  }>{dn.status}</Badge>
                </TableCell>
                <TableCell>{dn.invoice_number || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
