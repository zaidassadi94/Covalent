import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const customerCount = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE status = 'active'"
  ).get() as any;

  const invoiceStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN status != 'cancelled' THEN outstanding_amount ELSE 0 END) as total_outstanding,
      SUM(CASE WHEN status != 'cancelled' AND status != 'paid' AND due_date < ? AND document_type = 'invoice' THEN outstanding_amount ELSE 0 END) as overdue_amount
    FROM invoices WHERE document_type = 'invoice'
  `).get(today) as any;

  const agingBuckets = db.prepare(`
    SELECT
      SUM(CASE WHEN due_date >= ? THEN outstanding_amount ELSE 0 END) as current_amount,
      SUM(CASE WHEN due_date < ? AND julianday(?) - julianday(due_date) <= 30 THEN outstanding_amount ELSE 0 END) as bucket_1_30,
      SUM(CASE WHEN julianday(?) - julianday(due_date) > 30 AND julianday(?) - julianday(due_date) <= 60 THEN outstanding_amount ELSE 0 END) as bucket_31_60,
      SUM(CASE WHEN julianday(?) - julianday(due_date) > 60 AND julianday(?) - julianday(due_date) <= 90 THEN outstanding_amount ELSE 0 END) as bucket_61_90,
      SUM(CASE WHEN julianday(?) - julianday(due_date) > 90 THEN outstanding_amount ELSE 0 END) as bucket_90_plus
    FROM invoices
    WHERE status NOT IN ('cancelled', 'paid', 'draft') AND document_type = 'invoice'
  `).get(today, today, today, today, today, today, today, today) as any;

  const topCustomers = db.prepare(`
    SELECT c.name, SUM(i.total_amount) as revenue
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.document_type = 'invoice' AND i.status != 'cancelled'
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
    LIMIT 10
  `).all() as any[];

  const recentInvoices = db.prepare(`
    SELECT i.*, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.document_type = 'invoice' AND i.status != 'cancelled'
    ORDER BY i.created_at DESC
    LIMIT 5
  `).all() as any[];

  return NextResponse.json({
    customerCount: customerCount?.count || 0,
    invoiceTotal: invoiceStats?.total || 0,
    invoicePaid: invoiceStats?.paid || 0,
    totalOutstanding: invoiceStats?.total_outstanding || 0,
    overdueAmount: invoiceStats?.overdue_amount || 0,
    aging: {
      current: agingBuckets?.current_amount || 0,
      '1-30': agingBuckets?.bucket_1_30 || 0,
      '31-60': agingBuckets?.bucket_31_60 || 0,
      '61-90': agingBuckets?.bucket_61_90 || 0,
      '90+': agingBuckets?.bucket_90_plus || 0,
    },
    topCustomers: topCustomers || [],
    recentInvoices: recentInvoices || [],
  });
}
