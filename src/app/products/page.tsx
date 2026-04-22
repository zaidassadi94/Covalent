'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Package } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [hsCodes, setHsCodes] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams({ search, status: statusFilter });
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    fetch('/api/hs-codes').then(r => r.json()).then(d => setHsCodes(d.hsCodes || []));
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', description: '', unit: 'KGS', default_hs_code_id: '', packing_kg_per_unit: '', base_unit_price: '', standard_cost: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (product: any) => {
    setEditing(product);
    setForm({ ...product });
    setShowModal(true);
  };

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/products/${editing.id}` : '/api/products';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowModal(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('This product will be deactivated if used in any invoice. Continue?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  return (
    <>
      <PageHeader title="Products" description="Manage your product catalog">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text" placeholder="Search by code or description..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400" />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-zinc-400">Loading...</div></div>
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description="Add your first product to the catalog." action={{ label: 'Add Product', onClick: openNew }} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>H.S. Code</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Price (AED)</TableHead>
              <TableHead className="text-right">Packing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs font-medium">{p.code}</TableCell>
                <TableCell className="font-medium text-zinc-900">{p.description}</TableCell>
                <TableCell className="text-xs text-zinc-500">{p.hs_code || '—'}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(p.base_unit_price)}</TableCell>
                <TableCell className="text-right">{p.packing_kg_per_unit} {p.unit === 'KGS' ? 'Kg' : p.unit}/unit</TableCell>
                <TableCell><Badge variant={p.status === 'active' ? 'success' : 'default'}>{p.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(p.id)}>Delete</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="md">
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input label="Product Code *" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} />
          <Select label="Unit" value={form.unit || 'KGS'} onChange={e => setForm({ ...form, unit: e.target.value })}
            options={[{ value: 'KGS', label: 'KGS' }, { value: 'PCS', label: 'PCS' }, { value: 'LTR', label: 'LTR' }, { value: 'MTR', label: 'MTR' }, { value: 'BOX', label: 'BOX' }, { value: 'SET', label: 'SET' }, { value: 'ROL', label: 'ROL' }]} />
          <Input label="Description *" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="col-span-2" />
          <Select label="H.S. Code" value={form.default_hs_code_id || ''} onChange={e => setForm({ ...form, default_hs_code_id: e.target.value })} placeholder="Select..."
            options={hsCodes.map(h => ({ value: h.id, label: `${h.code} — ${h.description}` }))} className="col-span-2" />
          <Input label="Packing (Kg/Unit)" type="number" step="0.01" value={form.packing_kg_per_unit || ''} onChange={e => setForm({ ...form, packing_kg_per_unit: parseFloat(e.target.value) || 0 })} />
          <Input label="Base Unit Price (AED)" type="number" step="0.01" value={form.base_unit_price || ''} onChange={e => setForm({ ...form, base_unit_price: parseFloat(e.target.value) || 0 })} />
          <Input label="Standard Cost (AED)" type="number" step="0.01" value={form.standard_cost || ''} onChange={e => setForm({ ...form, standard_cost: parseFloat(e.target.value) || null })} placeholder="For margin tracking" />
          {editing && (
            <Select label="Status" value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.code || !form.description}>{editing ? 'Update' : 'Create Product'}</Button>
        </div>
      </Modal>
    </>
  );
}
