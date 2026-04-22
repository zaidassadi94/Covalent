'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { getToday } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

function NewDeliveryNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomer = searchParams.get('customer') || '';

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [hsCodes, setHsCodes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id: preselectedCustomer,
    dispatch_date: getToday(),
    purchase_order_number: 'Verbal',
    inco_term: '',
    hs_code_id: '',
    notes: '',
    status: 'dispatched',
  });

  const [items, setItems] = useState<any[]>([{ product_id: '', description: '', units: 1, packing_kg_per_unit: 0 }]);

  useEffect(() => {
    fetch('/api/customers?status=active&limit=500').then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch('/api/products?status=active').then(r => r.json()).then(d => setProducts(d.products || []));
    fetch('/api/hs-codes').then(r => r.json()).then(d => setHsCodes(d.hsCodes || []));
  }, []);

  useEffect(() => {
    if (form.customer_id) {
      const cust = customers.find(c => c.id === form.customer_id);
      if (cust) {
        setForm(f => ({ ...f, inco_term: cust.inco_term || '', hs_code_id: cust.default_hs_code_id || '' }));
      }
    }
  }, [form.customer_id, customers]);

  const handleProductChange = (idx: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      product_id: productId,
      description: product?.description || '',
      packing_kg_per_unit: product?.packing_kg_per_unit || 0,
    };
    setItems(newItems);
  };

  const addLine = () => {
    setItems([...items, { product_id: '', description: '', units: 1, packing_kg_per_unit: 0 }]);
  };

  const removeLine = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalUnits = items.reduce((s, i) => s + (i.units || 0), 0);
  const totalWeight = items.reduce((s, i) => s + (i.units || 0) * (i.packing_kg_per_unit || 0), 0);

  const handleSave = async (status?: string) => {
    setSaving(true);
    const payload = { ...form, items };
    if (status) payload.status = status;
    const res = await fetch('/api/delivery-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push('/delivery-notes');
    }
    setSaving(false);
  };

  return (
    <>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <PageHeader title="New Delivery Note" description="Create a dispatch document" />

      <div className="max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Select label="Customer *" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                placeholder="Select customer" options={customers.map(c => ({ value: c.id, label: c.name }))} className="col-span-2" />
              <Input label="Dispatch Date" type="date" value={form.dispatch_date} onChange={e => setForm({ ...form, dispatch_date: e.target.value })} />
              <Input label="Purchase Order #" value={form.purchase_order_number} onChange={e => setForm({ ...form, purchase_order_number: e.target.value })} />
              <Select label="Inco Term" value={form.inco_term} onChange={e => setForm({ ...form, inco_term: e.target.value })}
                options={[{ value: 'DDP UAE', label: 'DDP UAE' }, { value: 'EXW', label: 'EXW' }, { value: 'FOB', label: 'FOB' }, { value: 'CIF', label: 'CIF' }]} />
              <Select label="H.S. Code" value={form.hs_code_id} onChange={e => setForm({ ...form, hs_code_id: e.target.value })} placeholder="Select..."
                options={hsCodes.map(h => ({ value: h.id, label: `${h.code} — ${h.description}` }))} />
            </div>

            <div className="border-t border-zinc-100 pt-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Line Items</h3>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl bg-zinc-50/80">
                    <div className="col-span-4">
                      <Select label={idx === 0 ? 'Product' : undefined} value={item.product_id} onChange={e => handleProductChange(idx, e.target.value)}
                        placeholder="Select product" options={products.map(p => ({ value: p.id, label: `${p.code} — ${p.description}` }))} />
                    </div>
                    <div className="col-span-3">
                      <Input label={idx === 0 ? 'Description' : undefined} value={item.description} onChange={e => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                    </div>
                    <div className="col-span-1">
                      <Input label={idx === 0 ? 'Units' : undefined} type="number" min="1" value={item.units} onChange={e => { const n = [...items]; n[idx].units = parseInt(e.target.value) || 0; setItems(n); }} />
                    </div>
                    <div className="col-span-2">
                      <Input label={idx === 0 ? 'Kg/Unit' : undefined} type="number" step="0.01" value={item.packing_kg_per_unit} onChange={e => { const n = [...items]; n[idx].packing_kg_per_unit = parseFloat(e.target.value) || 0; setItems(n); }} />
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <label className="block text-sm font-medium text-zinc-700 mb-1.5">Weight</label>}
                      <p className="h-10 flex items-center text-sm font-medium text-zinc-700">
                        {((item.units || 0) * (item.packing_kg_per_unit || 0)).toFixed(1)}
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

              <div className="flex justify-end gap-8 mt-6 pt-4 border-t border-zinc-100">
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Total Units</p>
                  <p className="text-lg font-bold text-zinc-900">{totalUnits}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Total Weight (Kg)</p>
                  <p className="text-lg font-bold text-zinc-900">{totalWeight.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <Textarea label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-4" />

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button variant="secondary" onClick={() => handleSave('draft')}>Save as Draft</Button>
              <Button onClick={() => handleSave()} disabled={!form.customer_id || saving || items.some(i => !i.product_id)}>
                {saving ? 'Creating...' : 'Create Delivery Note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function NewDeliveryNotePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-zinc-400">Loading...</div></div>}>
      <NewDeliveryNoteForm />
    </Suspense>
  );
}
