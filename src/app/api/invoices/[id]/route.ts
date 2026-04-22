import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();

  const invoice = db.prepare(`
    SELECT i.*, c.name as customer_name, c.account_number, c.trn as customer_trn,
      c.address as customer_address, c.phone as customer_phone, c.email as customer_email,
      c.contact_person, c.is_export, c.country as customer_country,
      hs.code as hs_code, hs.description as hs_description
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    LEFT JOIN hs_codes hs ON i.hs_code_id = hs.id
    WHERE i.id = ?
  `).get(params.id) as any;

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const items = db.prepare(`
    SELECT ii.*, p.code as product_code
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ?
    ORDER BY ii.line_order
  `).all(params.id);

  const payments = db.prepare(`
    SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC
  `).all(params.id);

  const creditNotes = db.prepare(`
    SELECT * FROM invoices WHERE linked_invoice_id = ? AND document_type = 'credit_note' AND status != 'cancelled'
  `).all(params.id);

  const linkedDns = db.prepare(`
    SELECT dn.* FROM delivery_notes dn
    JOIN invoice_delivery_notes idn ON dn.id = idn.dn_id
    WHERE idn.invoice_id = ?
  `).all(params.id);

  let linkedInvoice = null;
  if (invoice.linked_invoice_id) {
    linkedInvoice = db.prepare('SELECT invoice_number, invoice_date, total_amount FROM invoices WHERE id = ?').get(invoice.linked_invoice_id);
  }

  const company = db.prepare('SELECT * FROM company WHERE id = ?').get('covalent');

  return NextResponse.json({
    ...invoice,
    items,
    payments,
    creditNotes,
    linkedDns,
    linkedInvoice,
    company,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();

  if (body.status) {
    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(body.status, params.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(params.id) as any;

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE invoice_id = ?').get(params.id) as any;
  if (paymentCount?.count > 0) {
    return NextResponse.json({ error: 'Cannot delete invoice with payments. Remove payments first.' }, { status: 400 });
  }

  // If credit note being deleted, restore linked invoice outstanding
  if (invoice.document_type === 'credit_note' && invoice.linked_invoice_id) {
    const linked = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.linked_invoice_id) as any;
    if (linked) {
      const newOutstanding = Math.min(linked.total_amount, linked.outstanding_amount + invoice.total_amount);
      const newStatus = newOutstanding >= linked.total_amount ? 'open' : 'partially_paid';
      db.prepare('UPDATE invoices SET outstanding_amount = ?, status = ? WHERE id = ?')
        .run(newOutstanding, newStatus, invoice.linked_invoice_id);
    }
  }

  db.prepare("UPDATE invoices SET status = 'cancelled' WHERE id = ?").run(params.id);
  return NextResponse.json({ success: true });
}
