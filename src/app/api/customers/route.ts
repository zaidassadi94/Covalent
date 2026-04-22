import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = req.nextUrl;
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || 'all';
  const salesRep = url.searchParams.get('sales_rep') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (c.name LIKE ? OR c.account_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status !== 'all') {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (salesRep) {
    where += ' AND c.sales_rep_id = ?';
    params.push(salesRep);
  }

  const countResult = db.prepare(
    `SELECT COUNT(*) as count FROM customers c ${where}`
  ).get(...params) as any;

  const customers = db.prepare(`
    SELECT c.*, sr.name as sales_rep_name, hs.code as hs_code, hs.description as hs_description,
      COALESCE((SELECT SUM(outstanding_amount) FROM invoices WHERE customer_id = c.id AND status NOT IN ('cancelled', 'paid') AND document_type = 'invoice'), 0) as outstanding
    FROM customers c
    LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
    LEFT JOIN hs_codes hs ON c.default_hs_code_id = hs.id
    ${where}
    ORDER BY c.name ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return NextResponse.json({
    customers,
    total: countResult?.count || 0,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const lastCustomer = db.prepare(
    "SELECT account_number FROM customers ORDER BY account_number DESC LIMIT 1"
  ).get() as any;

  let nextNum = 1001;
  if (lastCustomer?.account_number) {
    const num = parseInt(lastCustomer.account_number.replace('C-', ''));
    if (!isNaN(num)) nextNum = num + 1;
  }
  const accountNumber = `C-${String(nextNum).padStart(4, '0')}`;
  const id = generateId();

  db.prepare(`
    INSERT INTO customers (id, account_number, name, trn, is_export, country, address, phone, email, contact_person,
      credit_terms_days, payment_term, inco_term, shipment_mode, default_hs_code_id, sales_rep_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, accountNumber, body.name, body.trn || '', body.is_export ? 1 : 0,
    body.country || 'UAE', body.address || '', body.phone || '', body.email || '',
    body.contact_person || '', body.credit_terms_days || 30, body.payment_term || '30 Days',
    body.inco_term || 'DDP UAE', body.shipment_mode || 'By Road',
    body.default_hs_code_id || null, body.sales_rep_id || null, body.status || 'active'
  );

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return NextResponse.json(customer, { status: 201 });
}
