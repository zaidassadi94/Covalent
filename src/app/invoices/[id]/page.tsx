'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate, getToday, getAgingBucket, getAgingColor } from '@/lib/utils';
import { ArrowLeft, Download, DollarSign, FileText, XCircle, Receipt } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: getToday(), amount: 0, method: 'bank_transfer', reference: '', banking_name: '', notes: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const fetchInvoice = () => {
    fetch(`/api/invoices/${id}`)
      .then(r => r.json())
      .then(d => { setInvoice(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const handleRecordPayment = async () => {
    setPaymentSaving(true);
    const res = await fetch(`/api/invoices/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentForm),
    });
    if (res.ok) {
      setShowPaymentModal(false);
      fetchInvoice();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed');
    }
    setPaymentSaving(false);
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this document? This action preserves the document number for audit purposes.')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    fetchInvoice();
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment? The invoice outstanding will be restored.')) return;
    await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    fetchInvoice();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-zinc-400">Loading...</div></div>;
  if (!invoice) return <div className="text-center py-20 text-zinc-400">Invoice not found</div>;

  const isCN = invoice.document_type === 'credit_note';
  const aging = invoice.status === 'paid' || invoice.status === 'cancelled' || isCN
    ? null
    : getAgingBucket(invoice.due_date);

  return (
    <>
      <button onClick={() => router.push('/invoices')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{invoice.invoice_number}</h1>
            <Badge variant={isCN ? 'info' : 'default'}>{isCN ? 'Tax Credit Note' : 'Tax Invoice'}</Badge>
            <Badge variant={
              invoice.status === 'paid' ? 'success' :
              invoice.status === 'partially_paid' ? 'warning' :
              invoice.status === 'cancelled' ? 'danger' : 'default'
            }>{invoice.status.replace('_', ' ')}</Badge>
            {aging && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getAgingColor(aging.color)}`}>
                {aging.label}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            {invoice.customer_name} · {formatDate(invoice.invoice_date)}
            {invoice.is_zero_rated ? ' · Zero-rated supply' : ` · VAT ${invoice.vat_rate_applied}%`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isCN && invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <Button onClick={() => {
              setPaymentForm({ ...paymentForm, amount: invoice.outstanding_amount });
              setShowPaymentModal(true);
            }}>
              <DollarSign className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          )}
          <Button variant="outline" onClick={() => window.open(`/api/invoices/${id}/pdf`, '_blank')}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          {invoice.status !== 'cancelled' && (
            <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleCancel}>
              <XCircle className="h-4 w-4 mr-2" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Total Amount</p>
            <p className="text-xl font-bold text-zinc-900">{formatCurrency(invoice.total_amount)}</p>
          </CardContent>
        </Card>
        {!isCN && (
          <>
            <Card className="hover:shadow-sm">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-zinc-500 mb-1">Paid</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(invoice.total_amount - invoice.outstanding_amount)}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-zinc-500 mb-1">Outstanding</p>
                <p className="text-xl font-bold text-zinc-900">{formatCurrency(invoice.outstanding_amount)}</p>
              </CardContent>
            </Card>
          </>
        )}
        <Card className="hover:shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">VAT</p>
            <p className="text-xl font-bold text-zinc-900">{formatCurrency(invoice.vat_amount)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{invoice.vat_rate_applied}% rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit note reference */}
      {isCN && invoice.linkedInvoice && (
        <Card className="mb-6 border-sky-200 bg-sky-50/50">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm font-medium text-sky-900 mb-1">Against Tax Invoice: {invoice.linkedInvoice.invoice_number} dated {formatDate(invoice.linkedInvoice.invoice_date)}</p>
            <p className="text-sm text-sky-700">Reason: {invoice.credit_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice info grid */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
            <div><p className="text-zinc-500 text-xs mb-0.5">Customer TRN</p><p className="font-medium">{invoice.customer_trn || '—'}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">Due Date</p><p className="font-medium">{formatDate(invoice.due_date)}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">Payment Term</p><p className="font-medium">{invoice.payment_term || '—'}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">PO #</p><p className="font-medium">{invoice.purchase_order_number || '—'}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">Inco Term</p><p className="font-medium">{invoice.inco_term || '—'}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">H.S. Code</p><p className="font-medium">{invoice.hs_code ? `${invoice.hs_code} — ${invoice.hs_description}` : '—'}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">Shipment Mode</p><p className="font-medium">{invoice.shipment_mode || '—'}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">Customer Address</p><p className="font-medium">{invoice.customer_address || '—'}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Kg/Unit</TableHead>
                <TableHead className="text-right">Qty (Kg)</TableHead>
                <TableHead className="text-right">Price/Kg</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoice.items || []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.product_code}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.units}</TableCell>
                  <TableCell className="text-right">{item.packing_kg_per_unit}</TableCell>
                  <TableCell className="text-right">{item.total_qty_kg}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.taxable_amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.vat_amount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4 pt-4 border-t border-zinc-100">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">VAT ({invoice.vat_rate_applied}%)</span>
                <span className="font-medium">{formatCurrency(invoice.vat_amount)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-zinc-200">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits Applied */}
      {(invoice.creditNotes || []).length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Credits Applied</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoice.creditNotes.map((cn: any) => (
                <div key={cn.id} className="flex items-center justify-between p-3 rounded-xl bg-sky-50/50 border border-sky-100">
                  <div>
                    <p className="text-sm font-medium text-sky-900">{cn.invoice_number}</p>
                    <p className="text-xs text-sky-700">{formatDate(cn.invoice_date)} — {cn.credit_reason}</p>
                  </div>
                  <p className="text-sm font-semibold text-sky-900">-{formatCurrency(cn.total_amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {!isCN && (invoice.payments || []).length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.payments || []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                    <TableCell>{p.reference || '—'}</TableCell>
                    <TableCell>{p.banking_name || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeletePayment(p.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(invoice.internal_notes || invoice.customer_notes) && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            {invoice.internal_notes && (
              <div className="mb-3">
                <p className="text-xs font-medium text-zinc-500 mb-1">Internal Notes</p>
                <p className="text-sm text-zinc-700">{invoice.internal_notes}</p>
              </div>
            )}
            {invoice.customer_notes && (
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1">Customer Notes</p>
                <p className="text-sm text-zinc-700">{invoice.customer_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" size="md">
        <div className="space-y-4 mt-4">
          <Input label="Payment Date" type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
          <Input label="Amount (AED)" type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} />
          <Select label="Payment Method" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
            options={[{ value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'cheque', label: 'Cheque' }, { value: 'cash', label: 'Cash' }, { value: 'other', label: 'Other' }]} />
          <Input label="Reference" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Cheque #, Transaction ID, etc." />
          <Input label="Banking Name" value={paymentForm.banking_name} onChange={e => setPaymentForm({ ...paymentForm, banking_name: e.target.value })} />
          <Textarea label="Notes" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
          <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
          <Button onClick={handleRecordPayment} disabled={paymentSaving || paymentForm.amount <= 0}>
            {paymentSaving ? 'Saving...' : 'Record Payment'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
