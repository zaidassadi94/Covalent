import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const search = req.nextUrl.searchParams.get('search') || '';
  const status = req.nextUrl.searchParams.get('status') || 'all';

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (p.code LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status !== 'all') {
    where += ' AND p.status = ?';
    params.push(status);
  }

  const products = db.prepare(`
    SELECT p.*, hs.code as hs_code, hs.description as hs_description
    FROM products p
    LEFT JOIN hs_codes hs ON p.default_hs_code_id = hs.id
    ${where}
    ORDER BY p.code ASC
  `).all(...params) as any[];

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = generateId();

  db.prepare(`
    INSERT INTO products (id, code, description, unit, default_hs_code_id, packing_kg_per_unit, base_unit_price, standard_cost, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, body.code, body.description, body.unit || 'KGS', body.default_hs_code_id || null,
    body.packing_kg_per_unit || 0, body.base_unit_price || 0, body.standard_cost || null, body.status || 'active');

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return NextResponse.json(product, { status: 201 });
}
