import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(params.id) as any;
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(payment.invoice_id) as any;
  if (invoice) {
    const newOutstanding = Math.min(invoice.total_amount, invoice.outstanding_amount + payment.amount);
    const newStatus = newOutstanding >= invoice.total_amount ? 'open' : 'partially_paid';
    db.prepare('UPDATE invoices SET outstanding_amount = ?, status = ? WHERE id = ?')
      .run(newOutstanding, newStatus, invoice.id);
  }

  db.prepare('DELETE FROM payments WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
