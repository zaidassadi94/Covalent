'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getToday, addDays } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface LineItem {
  product_id: string;
  description: string;
  units: number;
  packing_kg_per_unit: number;
  total_qty_kg: number;
  unit_price: number;
  price_source: string;
}

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomer = searchParams.get('customer') || '';

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [hsCodes, setHsCodes] = useState<any[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [documentType, setDocumentType] = useState<'invoice' | 'credit_note'>('invoice');
  const [form, setForm] = useState({
    customer_id: preselectedCustomer,
    invoice_date: getToday(),
    due_date: '',
    purchase_order_number: '',
    inco_term: '',
    hs_code_id: '',
    payment_term: '',
    shipment_mode: '',
    vat_rate_applied: 5,
    linked_invoice_id: '',
    credit_reason: '',
    internal_notes: '',
    customer_notes: '',
  });

  const [items, setItems] = useState<LineItem[]>([{
    product_id: '', description: '', units: 1, packing_kg_per_unit: 0, total_qty_kg: 0, unit_price: 0, price_source: 'base',
  }]);

  useEffect(() => {
    fetch('/api/customers?status=active&limit=500').then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch('/api/products?status=active').then(r => r.json()).then(d => setProducts(d.products || []));
    fetch('/api/hs-codes').then(r => r.json()).then(d => setHsCodes(d.hsCodes || []));
  }, []);

  useEffect(() => {
    if (form.customer_id) {
      const cust = customers.find(c => c.id === form.customer_id);
      if (cust) {
        setForm(f => ({
          ...f,
          inco_term: cust.inco_term || '',
          hs_code_id: cust.default_hs_code_id || '',
          payment_term: cust.payment_term || '',
          shipment_mode: cust.shipment_mode || '',
          due_date: addDays(f.invoice_date, cust.credit_terms_days || 30),
        }));
      }
      fetch(`/api/invoices?customer_id=${form.customer_id}&type=invoice`)
        .then(r => r.json())
        .then(d => setCustomerInvoices((d.invoices || []).filter((i: any) => i.outstanding_amount > 0 && i.status !== 'cancelled')));
    }
  }, [form.customer_id, customers]);

  const handleProductChange = (idx: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newItems = [...items];
    const qty = (newItems[idx].units || 1) * (product.packing_kg_per_unit || 0);
    newItems[idx] = {
      ...newItems[idx],
      product_id: productId,
      description: product.description || '',
      packing_kg_per_unit: product.packing_kg_per_unit || 0,
      total_qty_kg: qty,
      unit_price: product.base_unit_price || 0,
      price_source: 'base',
    };
    setItems(newItems);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value;
    if (field === 'units' || field === 'packing_kg_per_unit') {
      newItems[idx].total_qty_kg = (newItems[idx].units || 0) * (newItems[idx].packing_kg_per_unit || 0);
    }
    if (field === 'unit_price') {
      newItems[idx].price_source = 'manual_override';
    }
    setItems(newItems);
  };

  const addLine = () => {
    setItems([...items, { product_id: '', description: '', units: 1, packing_kg_per_unit: 0, total_qty_kg: 0, unit_price: 0, price_source: 'base' }]);
  };

  const removeLine = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const vatRate = form.vat_rate_applied;
  const subtotal = items.reduce((s, i) => s + i.total_qty_kg * i.unit_price, 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        document_type: documentType,
        vat_rate_applied: vatRate,
        items,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/invoices/${data.id}`);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create');
    }
    setSaving(false);
  };

  const isCreditNote = documentType === 'credit_note';

  return (
    <>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <PageHeader title={isCreditNote ? 'New Credit Note' : 'New Invoice'} />

      <div className="max-w-5xl">
        {/* Document Type Toggle */}
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit mb-6">
          <button
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              !isCreditNote ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
            onClick={() => setDocumentType('invoice')}
          >
            Invoice
          </button>
          <button
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              isCreditNote ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
            onClick={() => setDocumentType('credit_note')}
          >
            Credit Note
          </button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Select label="Customer *" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                placeholder="Select customer" options={customers.map(c => ({ value: c.id, label: c.name }))} className="col-span-3" />

              {/* Credit Note specific fields */}
              {isCreditNote && (
                <>
                  <Select
                    label="Against Invoice *"
                    value={form.linked_invoice_id}
                    onChange={e => setForm({ ...form, linked_invoice_id: e.target.value })}
                    placeholder="Select invoice"
                    options={customerInvoices.map(i => ({
                      value: i.id,
                      label: `${i.invoice_number} — ${formatCurrency(i.total_amount)} (Outstanding: ${formatCurrency(i.outstanding_amount)})`
                    }))}
                    className="col-span-2"
                  />
                  <Input label="Reason for Credit Note *" value={form.credit_reason} onChange={e => setForm({ ...form, credit_reason: e.target.value })} placeholder="e.g. Goods returned, pricing error" className="col-span-1" />
                </>
              )}

              <Input label="Date" type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
              {!isCreditNote && (
                <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              )}
              <Input label="Purchase Order #" value={form.purchase_order_number} onChange={e => setForm({ ...form, purchase_order_number: e.target.value })} placeholder="Verbal" />

              {/* VAT Rate Override */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">VAT Rate (%)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={form.vat_rate_applied}
                    onChange={e => setForm({ ...form, vat_rate_applied: parseFloat(e.target.value) || 0 })}
                    className="flex h-10 w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                  <div className="flex gap-1">
                    {[5, 0].map(rate => (
                      <button
                        key={rate}
                        onClick={() => setForm({ ...form, vat_rate_applied: rate })}
                        className={`px-3 h-10 rounded-xl text-xs font-medium transition-all ${
                          form.vat_rate_applied === rate
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                  {form.vat_rate_applied === 0 && (
                    <Badge variant="info" className="self-center">Zero-rated</Badge>
                  )}
                </div>
              </div>

              <Select label="Inco Term" value={form.inco_term} onChange={e => setForm({ ...form, inco_term: e.target.value })}
                options={[{ value: 'DDP UAE', label: 'DDP UAE' }, { value: 'EXW', label: 'EXW' }, { value: 'FOB', label: 'FOB' }, { value: 'CIF', label: 'CIF' }]} />
              <Select label="H.S. Code" value={form.hs_code_id} onChange={e => setForm({ ...form, hs_code_id: e.target.value })} placeholder="Select..."
                options={hsCodes.map(h => ({ value: h.id, label: `${h.code} — ${h.description}` }))} />
            </div>

            {/* Line Items */}
            <div className="border-t border-zinc-100 pt-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Line Items</h3>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl bg-zinc-50/80">
                    <div className="col-span-3">
                      <Select label={idx === 0 ? 'Product' : undefined} value={item.product_id} onChange={e => handleProductChange(idx, e.target.value)}
                        placeholder="Select product" options={products.map(p => ({ value: p.id, label: `${p.code} — ${p.description}` }))} />
                    </div>
                    <div className="col-span-2">
                      <Input label={idx === 0 ? 'Description' : undefined} value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Input label={idx === 0 ? 'Units' : undefined} type="number" min="1" value={item.units} onChange={e => updateItem(idx, 'units', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-1">
                      <Input label={idx === 0 ? 'Kg/Unit' : undefined} type="number" step="0.01" value={item.packing_kg_per_unit} onChange={e => updateItem(idx, 'packing_kg_per_unit', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <label className="block text-sm font-medium text-zinc-700 mb-1.5">Qty (Kg)</label>}
                      <p className="h-10 flex items-center text-sm font-medium text-zinc-700">{item.total_qty_kg.toFixed(1)}</p>
                    </div>
                    <div className="col-span-2">
                      <Input label={idx === 0 ? 'Price/Kg (AED)' : undefined} type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <label className="block text-sm font-medium text-zinc-700 mb-1.5">Amount</label>}
                      <p className="h-10 flex items-center text-sm font-semibold text-zinc-900">
                        {formatCurrency(item.total_qty_kg * item.unit_price)}
                      </p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => removeLine(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Line
              </Button>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-6 pt-4 border-t border-zinc-100">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-medium text-zinc-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">VAT ({vatRate}%)</span>
                  <span className="font-medium text-zinc-900">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-zinc-200">
                  <span className="font-semibold text-zinc-900">Total</span>
                  <span className="font-bold text-zinc-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Textarea label="Internal Notes" value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} placeholder="Not shown on PDF" />
              <Textarea label="Customer Notes" value={form.customer_notes} onChange={e => setForm({ ...form, customer_notes: e.target.value })} placeholder="Shown on PDF" />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!form.customer_id || saving || items.some(i => !i.product_id) || (isCreditNote && (!form.linked_invoice_id || !form.credit_reason))}
              >
                {saving ? 'Creating...' : isCreditNote ? 'Create Credit Note' : 'Create Invoice'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-zinc-400">Loading...</div></div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}
