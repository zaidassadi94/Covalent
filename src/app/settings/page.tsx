'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Download } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [hsCodes, setHsCodes] = useState<any[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showHsModal, setShowHsModal] = useState(false);
  const [hsForm, setHsForm] = useState({ code: '', description: '' });
  const [showRepModal, setShowRepModal] = useState(false);
  const [repForm, setRepForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/hs-codes').then(r => r.json()),
      fetch('/api/sales-reps').then(r => r.json()),
    ]).then(([s, h, r]) => {
      setSettings(s);
      setHsCodes(h.hsCodes || []);
      setSalesReps(r.salesReps || []);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addHsCode = async () => {
    await fetch('/api/hs-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hsForm) });
    const res = await fetch('/api/hs-codes');
    const d = await res.json();
    setHsCodes(d.hsCodes || []);
    setShowHsModal(false);
    setHsForm({ code: '', description: '' });
  };

  const addRep = async () => {
    await fetch('/api/sales-reps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(repForm) });
    const res = await fetch('/api/sales-reps');
    const d = await res.json();
    setSalesReps(d.salesReps || []);
    setShowRepModal(false);
    setRepForm({ name: '', phone: '', email: '' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-zinc-400">Loading...</div></div>;

  const exportTypes = [
    { type: 'customers', label: 'Customers', desc: 'All customer master data' },
    { type: 'products', label: 'Products', desc: 'Product catalog with prices' },
    { type: 'invoices', label: 'Invoices', desc: 'Invoice headers with amounts' },
    { type: 'credit_notes', label: 'Credit Notes', desc: 'Credit notes with references' },
    { type: 'payments', label: 'Payments', desc: 'All payment records' },
    { type: 'vat_summary', label: 'VAT Summary', desc: 'For VAT return filing' },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Company configuration and data management">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
        </Button>
      </PageHeader>

      <div className="max-w-4xl space-y-8">
        {/* Company Information */}
        <Card>
          <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Company Name" value={settings.company_name || ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} className="col-span-2" />
              <Input label="TRN (Tax Registration Number)" value={settings.trn || ''} onChange={e => setSettings({ ...settings, trn: e.target.value })} />
              <Input label="Phone" value={settings.phone || ''} onChange={e => setSettings({ ...settings, phone: e.target.value })} />
              <Input label="Email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} />
              <Textarea label="Address" value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })} className="col-span-2" />
            </div>
          </CardContent>
        </Card>

        {/* Tax & Currency */}
        <Card>
          <CardHeader><CardTitle>Tax & Currency</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Default VAT Rate (%)" type="number" step="0.5" value={settings.default_vat_rate ?? 5} onChange={e => setSettings({ ...settings, default_vat_rate: parseFloat(e.target.value) || 0 })} />
              <Input label="Currency" value={settings.currency || 'AED'} disabled />
            </div>
            <p className="text-xs text-zinc-500 mt-2">VAT rate can be overridden per invoice during creation. Set the default here.</p>
          </CardContent>
        </Card>

        {/* Numbering */}
        <Card>
          <CardHeader><CardTitle>Document Numbering</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Invoice Prefix" value={settings.invoice_prefix || ''} onChange={e => setSettings({ ...settings, invoice_prefix: e.target.value })} />
              <Input label="Next Invoice Number" type="number" value={settings.next_invoice_number || 1001} onChange={e => setSettings({ ...settings, next_invoice_number: parseInt(e.target.value) || 1001 })} />
              <div />
              <Input label="Credit Note Prefix" value={settings.credit_note_prefix || ''} onChange={e => setSettings({ ...settings, credit_note_prefix: e.target.value })} />
              <Input label="Next CN Number" type="number" value={settings.next_credit_note_number || 1} onChange={e => setSettings({ ...settings, next_credit_note_number: parseInt(e.target.value) || 1 })} />
              <div />
              <Input label="DN Prefix" value={settings.dn_prefix || ''} onChange={e => setSettings({ ...settings, dn_prefix: e.target.value })} />
              <Input label="Next DN Number" type="number" value={settings.next_dn_number || 1001} onChange={e => setSettings({ ...settings, next_dn_number: parseInt(e.target.value) || 1001 })} />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank Name" value={settings.bank_name || ''} onChange={e => setSettings({ ...settings, bank_name: e.target.value })} />
              <Input label="Account Number" value={settings.bank_account_number || ''} onChange={e => setSettings({ ...settings, bank_account_number: e.target.value })} />
              <Input label="IBAN" value={settings.iban || ''} onChange={e => setSettings({ ...settings, iban: e.target.value })} />
              <Input label="SWIFT Code" value={settings.swift_code || ''} onChange={e => setSettings({ ...settings, swift_code: e.target.value })} />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Bank details are displayed on invoice PDFs.</p>
          </CardContent>
        </Card>

        {/* H.S. Codes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>H.S. Codes (Product Categories)</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowHsModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Code
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hsCodes.map(hs => (
                  <TableRow key={hs.id}>
                    <TableCell className="font-mono text-xs">{hs.code}</TableCell>
                    <TableCell>{hs.description}</TableCell>
                    <TableCell><Badge variant="success">{hs.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sales Reps */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales Representatives</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowRepModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Rep
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReps.map(rep => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell>{rep.phone || '—'}</TableCell>
                    <TableCell>{rep.email || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Data Exports */}
        <Card>
          <CardHeader><CardTitle>Data Exports (CSV)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-4">Export data for your accountant or VAT filing. All exports are CSV format, Excel-compatible.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {exportTypes.map(exp => (
                <button
                  key={exp.type}
                  onClick={() => window.open(`/api/export?type=${exp.type}`, '_blank')}
                  className="flex flex-col items-start p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all group text-left"
                >
                  <Download className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 mb-2" />
                  <p className="text-sm font-medium text-zinc-900">{exp.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{exp.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HS Code Modal */}
      <Modal open={showHsModal} onClose={() => setShowHsModal(false)} title="Add H.S. Code" size="sm">
        <div className="space-y-4 mt-4">
          <Input label="Code" value={hsForm.code} onChange={e => setHsForm({ ...hsForm, code: e.target.value })} placeholder="e.g. 3506 9100" />
          <Input label="Description" value={hsForm.description} onChange={e => setHsForm({ ...hsForm, description: e.target.value })} placeholder="e.g. Hotmelt Adhesive" />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
          <Button variant="outline" onClick={() => setShowHsModal(false)}>Cancel</Button>
          <Button onClick={addHsCode} disabled={!hsForm.code || !hsForm.description}>Add</Button>
        </div>
      </Modal>

      {/* Sales Rep Modal */}
      <Modal open={showRepModal} onClose={() => setShowRepModal(false)} title="Add Sales Representative" size="sm">
        <div className="space-y-4 mt-4">
          <Input label="Name" value={repForm.name} onChange={e => setRepForm({ ...repForm, name: e.target.value })} />
          <Input label="Phone" value={repForm.phone} onChange={e => setRepForm({ ...repForm, phone: e.target.value })} />
          <Input label="Email" value={repForm.email} onChange={e => setRepForm({ ...repForm, email: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
          <Button variant="outline" onClick={() => setShowRepModal(false)}>Cancel</Button>
          <Button onClick={addRep} disabled={!repForm.name}>Add</Button>
        </div>
      </Modal>
    </>
  );
}
