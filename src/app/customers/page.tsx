'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Users, Eye } from 'lucide-react';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [hsCodes, setHsCodes] = useState<any[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});

  const fetchCustomers = useCallback(async () => {
    const params = new URLSearchParams({ search, status: statusFilter });
    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    fetch('/api/hs-codes').then(r => r.json()).then(d => setHsCodes(d.hsCodes || []));
    fetch('/api/sales-reps').then(r => r.json()).then(d => setSalesReps(d.salesReps || []));
  }, []);

  const openNew = () => {
    setEditingCustomer(null);
    setForm({ name: '', trn: '', is_export: false, country: 'UAE', address: '', phone: '', email: '', contact_person: '', credit_terms_days: 30, payment_term: '30 Days', inco_term: 'DDP UAE', shipment_mode: 'By Road', default_hs_code_id: '', sales_rep_id: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (customer: any) => {
    setEditingCustomer(customer);
    setForm({ ...customer, is_export: !!customer.is_export });
    setShowModal(true);
  };

  const handleSave = async () => {
    const method = editingCustomer ? 'PUT' : 'POST';
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowModal(false);
    fetchCustomers();
  };

  return (
    <>
      <PageHeader title="Customers" description="Manage your customer accounts">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or account number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-zinc-400">Loading...</div>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Get started by adding your first customer."
          action={{ label: 'Add Customer', onClick: openNew }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account #</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Sales Rep</TableHead>
              <TableHead>Credit Terms</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map(c => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                <TableCell className="font-mono text-xs">{c.account_number}</TableCell>
                <TableCell>
                  <div>
                    <span className="font-medium text-zinc-900">{c.name}</span>
                    {c.is_export ? (
                      <Badge variant="info" className="ml-2">Export</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{c.sales_rep_name || '—'}</TableCell>
                <TableCell>{c.payment_term}</TableCell>
                <TableCell className="text-right font-medium">
                  {c.outstanding > 0 ? formatCurrency(c.outstanding) : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === 'active' ? 'success' : 'default'}>{c.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/customers/${c.id}`)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingCustomer ? 'Edit Customer' : 'Add Customer'} size="lg">
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input label="Customer Name *" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="col-span-2" />
          <Input label="TRN" value={form.trn || ''} onChange={e => setForm({ ...form, trn: e.target.value })} />
          <Select label="Country" value={form.country || 'UAE'} onChange={e => setForm({ ...form, country: e.target.value })}
            options={[{ value: 'UAE', label: 'UAE' }, { value: 'Saudi Arabia', label: 'Saudi Arabia' }, { value: 'Oman', label: 'Oman' }, { value: 'Bahrain', label: 'Bahrain' }, { value: 'Qatar', label: 'Qatar' }, { value: 'Kuwait', label: 'Kuwait' }, { value: 'Other', label: 'Other' }]} />
          <div className="col-span-2 flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <input type="checkbox" id="is_export" checked={!!form.is_export} onChange={e => setForm({ ...form, is_export: e.target.checked })} className="h-4 w-4 rounded" />
            <label htmlFor="is_export" className="text-sm text-zinc-700">Export customer (outside UAE)</label>
          </div>
          <Textarea label="Address" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="col-span-2" />
          <Input label="Phone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Contact Person" value={form.contact_person || ''} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
          <Input label="Credit Terms (Days)" type="number" value={form.credit_terms_days || 30} onChange={e => setForm({ ...form, credit_terms_days: parseInt(e.target.value) || 30, payment_term: `${e.target.value} Days` })} />
          <Select label="Inco Term" value={form.inco_term || ''} onChange={e => setForm({ ...form, inco_term: e.target.value })}
            options={[{ value: 'DDP UAE', label: 'DDP UAE' }, { value: 'EXW', label: 'EXW' }, { value: 'FOB', label: 'FOB' }, { value: 'CIF', label: 'CIF' }, { value: 'CFR', label: 'CFR' }]} />
          <Select label="Shipment Mode" value={form.shipment_mode || ''} onChange={e => setForm({ ...form, shipment_mode: e.target.value })}
            options={[{ value: 'By Road', label: 'By Road' }, { value: 'By Sea', label: 'By Sea' }, { value: 'By Air', label: 'By Air' }]} />
          <Select label="H.S. Code" value={form.default_hs_code_id || ''} onChange={e => setForm({ ...form, default_hs_code_id: e.target.value })} placeholder="Select H.S. Code"
            options={hsCodes.map(h => ({ value: h.id, label: `${h.code} — ${h.description}` }))} />
          <Select label="Sales Rep" value={form.sales_rep_id || ''} onChange={e => setForm({ ...form, sales_rep_id: e.target.value })} placeholder="Select Sales Rep"
            options={salesReps.map(r => ({ value: r.id, label: r.name }))} />
          {editingCustomer && (
            <Select label="Status" value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name}>{editingCustomer ? 'Update Customer' : 'Create Customer'}</Button>
        </div>
      </Modal>
    </>
  );
}
