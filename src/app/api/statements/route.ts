import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const customerId = req.nextUrl.searchParams.get('customer_id') || '';
  const today = new Date().toISOString().split('T')[0];

  if (customerId) {
    const customer = db.prepare(`
      SELECT c.*, sr.name as sales_rep_name
      FROM customers c LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
      WHERE c.id = ?
    `).get(customerId) as any;

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const entries = db.prepare(`
      SELECT
        i.invoice_date as date,
        i.invoice_number as doc_number,
        i.document_type as type,
        CASE WHEN i.document_type = 'credit_note' THEN i.credit_reason ELSE 'Tax Invoice' END as description,
        CASE WHEN i.document_type = 'invoice' THEN i.total_amount ELSE 0 END as debit,
        CASE WHEN i.document_type = 'credit_note' THEN i.total_amount ELSE 0 END as credit
      FROM invoices i
      WHERE i.customer_id = ? AND i.status != 'cancelled'
      UNION ALL
      SELECT
        p.payment_date as date,
        'Payment' as doc_number,
        'payment' as type,
        CONCAT(p.method, ' - ', p.reference) as description,
        0 as debit,
        p.amount as credit
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.customer_id = ?
      ORDER BY date ASC
    `).all(customerId, customerId) as any[];

    let runningBalance = 0;
    const statement = entries.map(entry => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0);
      return { ...entry, balance: Math.round(runningBalance * 100) / 100 };
    });

    const outstanding = db.prepare(`
      SELECT COALESCE(SUM(outstanding_amount), 0) as total
      FROM invoices WHERE customer_id = ? AND status NOT IN ('cancelled', 'paid') AND document_type = 'invoice'
    `).get(customerId) as any;

    return NextResponse.json({ customer, statement, totalOutstanding: outstanding?.total || 0 });
  }

  // Summary view - all customers
  const customers = db.prepare(`
    SELECT c.id, c.account_number, c.name, sr.name as sales_rep_name,
      COALESCE(inv.total_outstanding, 0) as total_outstanding,
      COALESCE(inv.overdue_amount, 0) as overdue_amount,
      COALESCE(inv.current_amount, 0) as current_amount,
      COALESCE(inv.bucket_1_30, 0) as bucket_1_30,
      COALESCE(inv.bucket_31_60, 0) as bucket_31_60,
      COALESCE(inv.bucket_61_90, 0) as bucket_61_90,
      COALESCE(inv.bucket_90_plus, 0) as bucket_90_plus
    FROM customers c
    LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
    LEFT JOIN (
      SELECT customer_id,
        SUM(outstanding_amount) as total_outstanding,
        SUM(CASE WHEN due_date < '${today}' THEN outstanding_amount ELSE 0 END) as overdue_amount,
        SUM(CASE WHEN due_date >= '${today}' THEN outstanding_amount ELSE 0 END) as current_amount,
        SUM(CASE WHEN due_date < '${today}' AND julianday('${today}') - julianday(due_date) <= 30 THEN outstanding_amount ELSE 0 END) as bucket_1_30,
        SUM(CASE WHEN julianday('${today}') - julianday(due_date) > 30 AND julianday('${today}') - julianday(due_date) <= 60 THEN outstanding_amount ELSE 0 END) as bucket_31_60,
        SUM(CASE WHEN julianday('${today}') - julianday(due_date) > 60 AND julianday('${today}') - julianday(due_date) <= 90 THEN outstanding_amount ELSE 0 END) as bucket_61_90,
        SUM(CASE WHEN julianday('${today}') - julianday(due_date) > 90 THEN outstanding_amount ELSE 0 END) as bucket_90_plus
      FROM invoices
      WHERE status NOT IN ('cancelled', 'paid') AND document_type = 'invoice'
      GROUP BY customer_id
    ) inv ON c.id = inv.customer_id
    WHERE c.status = 'active' AND COALESCE(inv.total_outstanding, 0) > 0
    ORDER BY inv.total_outstanding DESC
  `).all() as any[];

  const totals = {
    totalOutstanding: customers.reduce((s, c) => s + c.total_outstanding, 0),
    current: customers.reduce((s, c) => s + c.current_amount, 0),
    overdue: customers.reduce((s, c) => s + c.overdue_amount, 0),
    bucket_1_30: customers.reduce((s, c) => s + c.bucket_1_30, 0),
    bucket_31_60: customers.reduce((s, c) => s + c.bucket_31_60, 0),
    bucket_61_90: customers.reduce((s, c) => s + c.bucket_61_90, 0),
    bucket_90_plus: customers.reduce((s, c) => s + c.bucket_90_plus, 0),
    customerCount: customers.length,
  };

  return NextResponse.json({ customers, totals });
}
