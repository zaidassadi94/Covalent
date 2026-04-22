import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const search = req.nextUrl.searchParams.get('search') || '';
  const status = req.nextUrl.searchParams.get('status') || 'all';
  const customerId = req.nextUrl.searchParams.get('customer_id') || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (dn.dn_number LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status !== 'all') {
    where += ' AND dn.status = ?';
    params.push(status);
  }
  if (customerId) {
    where += ' AND dn.customer_id = ?';
    params.push(customerId);
  }

  const countResult = db.prepare(
    `SELECT COUNT(*) as count FROM delivery_notes dn JOIN customers c ON dn.customer_id = c.id ${where}`
  ).get(...params) as any;

  const dns = db.prepare(`
    SELECT dn.*, c.name as customer_name, i.invoice_number,
      COALESCE((SELECT SUM(units) FROM delivery_note_items WHERE dn_id = dn.id), 0) as total_units,
      COALESCE((SELECT SUM(total_weight_kg) FROM delivery_note_items WHERE dn_id = dn.id), 0) as total_weight
    FROM delivery_notes dn
    JOIN customers c ON dn.customer_id = c.id
    LEFT JOIN invoices i ON dn.invoice_id = i.id
    ${where}
    ORDER BY dn.dispatch_date DESC, dn.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return NextResponse.json({ deliveryNotes: dns, total: countResult?.count || 0, page, limit });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const company = db.prepare('SELECT * FROM company WHERE id = ?').get('covalent') as any;
  const dnNum = `${company.dn_prefix}${String(company.next_dn_number).padStart(4, '0')}`;
  db.prepare('UPDATE company SET next_dn_number = next_dn_number + 1 WHERE id = ?').run('covalent');

  const id = generateId();

  db.prepare(`
    INSERT INTO delivery_notes (id, dn_number, customer_id, dispatch_date, purchase_order_number,
      inco_term, hs_code_id, notes, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, dnNum, body.customer_id, body.dispatch_date, body.purchase_order_number || 'Verbal',
    body.inco_term || '', body.hs_code_id || null, body.notes || '', body.status || 'dispatched', body.created_by || null);

  if (body.items && Array.isArray(body.items)) {
    const stmt = db.prepare(`
      INSERT INTO delivery_note_items (id, dn_id, product_id, description, units, packing_kg_per_unit, total_weight_kg, line_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    body.items.forEach((item: any, idx: number) => {
      const weight = (item.units || 0) * (item.packing_kg_per_unit || 0);
      stmt.run(generateId(), id, item.product_id, item.description || '', item.units || 1,
        item.packing_kg_per_unit || 0, weight, idx);
    });
  }

  const dn = db.prepare('SELECT * FROM delivery_notes WHERE id = ?').get(id);
  return NextResponse.json(dn, { status: 201 });
}
