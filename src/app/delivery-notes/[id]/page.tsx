'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Receipt, XCircle } from 'lucide-react';

export default function DeliveryNoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [dn, setDn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/delivery-notes/${id}`)
      .then(r => r.json())
      .then(d => { setDn(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!confirm('Cancel this delivery note?')) return;
    await fetch(`/api/delivery-notes/${id}`, { method: 'DELETE' });
    router.push('/delivery-notes');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-zinc-400">Loading...</div></div>;
  if (!dn) return <div className="text-center py-20 text-zinc-400">Delivery note not found</div>;

  const totalUnits = (dn.items || []).reduce((s: number, i: any) => s + (i.units || 0), 0);
  const totalWeight = (dn.items || []).reduce((s: number, i: any) => s + (i.total_weight_kg || 0), 0);

  return (
    <>
      <button onClick={() => router.push('/delivery-notes')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Delivery Notes
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{dn.dn_number}</h1>
            <Badge variant={
              dn.status === 'invoiced' ? 'success' :
              dn.status === 'dispatched' ? 'warning' :
              dn.status === 'cancelled' ? 'danger' : 'default'
            }>{dn.status}</Badge>
          </div>
          <p className="text-sm text-zinc-500">{dn.customer_name} · {formatDate(dn.dispatch_date)}</p>
        </div>
        <div className="flex gap-2">
          {dn.status === 'dispatched' && (
            <Button onClick={() => router.push(`/invoices/new?customer=${dn.customer_id}`)}>
              <Receipt className="h-4 w-4 mr-2" /> Create Invoice
            </Button>
          )}
          {dn.status !== 'invoiced' && dn.status !== 'cancelled' && (
            <Button variant="outline" className="text-red-600" onClick={handleCancel}>
              <XCircle className="h-4 w-4 mr-2" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
              <div><p className="text-zinc-500 text-xs mb-0.5">Customer</p><p className="font-medium">{dn.customer_name}</p></div>
              <div><p className="text-zinc-500 text-xs mb-0.5">Dispatch Date</p><p className="font-medium">{formatDate(dn.dispatch_date)}</p></div>
              <div><p className="text-zinc-500 text-xs mb-0.5">PO #</p><p className="font-medium">{dn.purchase_order_number || 'Verbal'}</p></div>
              <div><p className="text-zinc-500 text-xs mb-0.5">Inco Term</p><p className="font-medium">{dn.inco_term || '—'}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Kg/Unit</TableHead>
                  <TableHead className="text-right">Weight (Kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dn.items || []).map((item: any, idx: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{item.product_code}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.units}</TableCell>
                    <TableCell className="text-right">{item.packing_kg_per_unit}</TableCell>
                    <TableCell className="text-right font-medium">{Number(item.total_weight_kg).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-8 mt-4 pt-4 border-t border-zinc-100">
              <div className="text-right">
                <p className="text-xs text-zinc-500">Total Units</p>
                <p className="text-lg font-bold text-zinc-900">{totalUnits}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Total Weight (Kg)</p>
                <p className="text-lg font-bold text-zinc-900">{totalWeight.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {dn.notes && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-zinc-500 mb-1">Notes</p>
              <p className="text-sm text-zinc-700">{dn.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
