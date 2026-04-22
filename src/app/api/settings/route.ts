import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const company = db.prepare('SELECT * FROM company WHERE id = ?').get('covalent');
  return NextResponse.json(company);
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  db.prepare(`
    UPDATE company SET
      company_name = ?, trn = ?, address = ?, phone = ?, email = ?,
      default_vat_rate = ?, letterhead_image = ?,
      invoice_prefix = ?, next_invoice_number = ?,
      credit_note_prefix = ?, next_credit_note_number = ?,
      dn_prefix = ?, next_dn_number = ?,
      aging_buckets = ?,
      bank_name = ?, bank_account_number = ?, iban = ?, swift_code = ?
    WHERE id = ?
  `).run(
    body.company_name, body.trn || '', body.address || '', body.phone || '', body.email || '',
    body.default_vat_rate ?? 5, body.letterhead_image || '',
    body.invoice_prefix || 'INV-', body.next_invoice_number || 1001,
    body.credit_note_prefix || 'CN-', body.next_credit_note_number || 1,
    body.dn_prefix || 'DN-', body.next_dn_number || 1001,
    body.aging_buckets || '[30, 60, 90, 120]',
    body.bank_name || '', body.bank_account_number || '', body.iban || '', body.swift_code || '',
    'covalent'
  );

  return NextResponse.json({ success: true });
}
