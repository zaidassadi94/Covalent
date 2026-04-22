import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const invoiceId = params.id;

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  if (body.amount > invoice.outstanding_amount) {
    return NextResponse.json({
      error: `Payment amount (AED ${body.amount.toFixed(2)}) exceeds invoice outstanding (AED ${invoice.outstanding_amount.toFixed(2)}).`
    }, { status: 400 });
  }

  const paymentId = generateId();
  db.prepare(`
    INSERT INTO payments (id, invoice_id, payment_date, amount, method, reference, banking_name, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(paymentId, invoiceId, body.payment_date, body.amount, body.method || 'bank_transfer',
    body.reference || '', body.banking_name || '', body.notes || '', body.created_by || null);

  const newOutstanding = Math.round((invoice.outstanding_amount - body.amount) * 100) / 100;
  const newStatus = newOutstanding <= 0 ? 'paid' : 'partially_paid';

  db.prepare('UPDATE invoices SET outstanding_amount = ?, status = ? WHERE id = ?')
    .run(Math.max(0, newOutstanding), newStatus, invoiceId);

  return NextResponse.json({ success: true, paymentId }, { status: 201 });
}
