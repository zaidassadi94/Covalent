import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const { id } = params;

  const customer = db.prepare(`
    SELECT c.*, sr.name as sales_rep_name, hs.code as hs_code, hs.description as hs_description
    FROM customers c
    LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
    LEFT JOIN hs_codes hs ON c.default_hs_code_id = hs.id
    WHERE c.id = ?
  `).get(id) as any;

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const invoices = db.prepare(`
    SELECT i.*,
      COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as paid_amount
    FROM invoices i
    WHERE i.customer_id = ? AND i.status != 'cancelled'
    ORDER BY i.invoice_date DESC
  `).all(id) as any[];

  const deliveryNotes = db.prepare(`
    SELECT dn.*
    FROM delivery_notes dn
    WHERE dn.customer_id = ? AND dn.status != 'cancelled'
    ORDER BY dn.dispatch_date DESC
  `).all(id) as any[];

  const payments = db.prepare(`
    SELECT p.*, i.invoice_number
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    WHERE i.customer_id = ?
    ORDER BY p.payment_date DESC
  `).all(id) as any[];

  const creditNotes = db.prepare(`
    SELECT i.*, li.invoice_number as linked_invoice_number
    FROM invoices i
    LEFT JOIN invoices li ON i.linked_invoice_id = li.id
    WHERE i.customer_id = ? AND i.document_type = 'credit_note' AND i.status != 'cancelled'
    ORDER BY i.invoice_date DESC
  `).all(id) as any[];

  const priceList = db.prepare(`
    SELECT cpp.*, p.code as product_code, p.description as product_description
    FROM customer_product_prices cpp
    JOIN products p ON cpp.product_id = p.id
    WHERE cpp.customer_id = ?
    ORDER BY p.code
  `).all(id) as any[];

  const outstanding = db.prepare(`
    SELECT COALESCE(SUM(outstanding_amount), 0) as total
    FROM invoices
    WHERE customer_id = ? AND status NOT IN ('cancelled', 'paid') AND document_type = 'invoice'
  `).get(id) as any;

  return NextResponse.json({
    ...customer,
    outstanding: outstanding?.total || 0,
    invoices,
    deliveryNotes,
    payments,
    creditNotes,
    priceList,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const { id } = params;
  const body = await req.json();

  db.prepare(`
    UPDATE customers SET
      name = ?, trn = ?, is_export = ?, country = ?, address = ?, phone = ?, email = ?,
      contact_person = ?, credit_terms_days = ?, payment_term = ?, inco_term = ?,
      shipment_mode = ?, default_hs_code_id = ?, sales_rep_id = ?, status = ?
    WHERE id = ?
  `).run(
    body.name, body.trn || '', body.is_export ? 1 : 0, body.country || 'UAE',
    body.address || '', body.phone || '', body.email || '', body.contact_person || '',
    body.credit_terms_days || 30, body.payment_term || '30 Days',
    body.inco_term || 'DDP UAE', body.shipment_mode || 'By Road',
    body.default_hs_code_id || null, body.sales_rep_id || null,
    body.status || 'active', id
  );

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return NextResponse.json(customer);
}
