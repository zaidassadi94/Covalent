'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate, getAgingBucket, getAgingColor } from '@/lib/utils';
import { ArrowLeft, Receipt, FileText, CreditCard, FileDown, Plus } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(d => { setCustomer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-zinc-400">Loading...</div></div>;
  if (!customer) return <div className="text-center py-20 text-zinc-400">Customer not found</div>;

  const tabs = [
    { id: 'invoices', label: 'Invoices', count: customer.invoices?.filter((i: any) => i.document_type === 'invoice').length || 0 },
    { id: 'delivery-notes', label: 'Delivery Notes', count: customer.deliveryNotes?.length || 0 },
    { id: 'payments', label: 'Payments', count: customer.payments?.length || 0 },
    { id: 'credit-notes', label: 'Credit Notes', count: customer.creditNotes?.length || 0 },
    { id: 'price-list', label: 'Price List', count: customer.priceList?.length || 0 },
  ];

  const invoices = (customer.invoices || []).filter((i: any) => i.document_type === 'invoice');

  return (
    <>
      <div className="mb-6">
        <button onClick={() => router.push('/customers')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
        </button>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{customer.name}</h1>
            <Badge variant={customer.status === 'active' ? 'success' : 'default'}>{customer.status}</Badge>
            {customer.is_export ? <Badge variant="info">Export — 0% VAT</Badge> : null}
          </div>
          <p className="text-sm text-zinc-500">{customer.account_number} · {customer.country}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/invoices/new?customer=${id}`)}>
            <Receipt className="h-4 w-4 mr-2" /> Create Invoice
          </Button>
          <Button variant="outline" onClick={() => router.push(`/delivery-notes/new?customer=${id}`)}>
            <FileText className="h-4 w-4 mr-2" /> Create DN
          </Button>
        </div>
      </div>

      {/* Customer info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Outstanding</p>
            <p className="text-xl font-bold text-zinc-900">{formatCurrency(customer.outstanding || 0)}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Credit Terms</p>
            <p className="text-xl font-bold text-zinc-900">{customer.payment_term}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">TRN</p>
            <p className="text-base font-medium text-zinc-900 font-mono">{customer.trn || '—'}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Sales Rep</p>
            <p className="text-base font-medium text-zinc-900">{customer.sales_rep_name || '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 mb-6">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'invoices' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Aging</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-zinc-400">No invoices yet</TableCell></TableRow>
            ) : invoices.map((inv: any) => {
              const aging = inv.status === 'paid' ? { label: 'Paid', color: 'gray' } : getAgingBucket(inv.due_date);
              return (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${inv.id}`)}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getAgingColor(aging.color)}`}>
                      {aging.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inv.outstanding_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'warning' : 'default'}>
                      {inv.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {activeTab === 'delivery-notes' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DN #</TableHead>
              <TableHead>Dispatch Date</TableHead>
              <TableHead>PO #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice #</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customer.deliveryNotes || []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-400">No delivery notes yet</TableCell></TableRow>
            ) : (customer.deliveryNotes || []).map((dn: any) => (
              <TableRow key={dn.id}>
                <TableCell className="font-medium">{dn.dn_number}</TableCell>
                <TableCell>{formatDate(dn.dispatch_date)}</TableCell>
                <TableCell>{dn.purchase_order_number}</TableCell>
                <TableCell><Badge variant={dn.status === 'invoiced' ? 'success' : dn.status === 'dispatched' ? 'warning' : 'default'}>{dn.status}</Badge></TableCell>
                <TableCell>{dn.invoice_id ? '—' : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {activeTab === 'payments' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customer.payments || []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-400">No payments yet</TableCell></TableRow>
            ) : (customer.payments || []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.payment_date)}</TableCell>
                <TableCell className="font-medium">{p.invoice_number}</TableCell>
                <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                <TableCell>{p.reference || '—'}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {activeTab === 'credit-notes' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CN #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Against Invoice</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customer.creditNotes || []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-400">No credit notes yet</TableCell></TableRow>
            ) : (customer.creditNotes || []).map((cn: any) => (
              <TableRow key={cn.id}>
                <TableCell className="font-medium">{cn.invoice_number}</TableCell>
                <TableCell>{formatDate(cn.invoice_date)}</TableCell>
                <TableCell>{cn.linked_invoice_number || '—'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{cn.credit_reason}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(cn.total_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {activeTab === 'price-list' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Unit Price (AED)</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customer.priceList || []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-400">No custom prices set</TableCell></TableRow>
            ) : (customer.priceList || []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.product_code}</TableCell>
                <TableCell>{p.product_description}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(p.unit_price)}</TableCell>
                <TableCell>{p.effective_from ? formatDate(p.effective_from) : '—'}</TableCell>
                <TableCell>{p.effective_to ? formatDate(p.effective_to) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
