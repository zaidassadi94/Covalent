import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const search = req.nextUrl.searchParams.get('search') || '';
  const method = req.nextUrl.searchParams.get('method') || 'all';
  const customerId = req.nextUrl.searchParams.get('customer_id') || '';
  const dateFrom = req.nextUrl.searchParams.get('date_from') || '';
  const dateTo = req.nextUrl.searchParams.get('date_to') || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR p.reference LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (method !== 'all') {
    where += ' AND p.method = ?';
    params.push(method);
  }
  if (customerId) {
    where += ' AND i.customer_id = ?';
    params.push(customerId);
  }
  if (dateFrom) {
    where += ' AND p.payment_date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ' AND p.payment_date <= ?';
    params.push(dateTo);
  }

  const countResult = db.prepare(`
    SELECT COUNT(*) as count FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN customers c ON i.customer_id = c.id
    ${where}
  `).get(...params) as any;

  const payments = db.prepare(`
    SELECT p.*, i.invoice_number, c.name as customer_name
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN customers c ON i.customer_id = c.id
    ${where}
    ORDER BY p.payment_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return NextResponse.json({ payments, total: countResult?.count || 0, page, limit });
}
