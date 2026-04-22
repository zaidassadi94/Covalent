import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, hs.code as hs_code, hs.description as hs_description
    FROM products p
    LEFT JOIN hs_codes hs ON p.default_hs_code_id = hs.id
    WHERE p.id = ?
  `).get(params.id);

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();

  db.prepare(`
    UPDATE products SET code = ?, description = ?, unit = ?, default_hs_code_id = ?,
    packing_kg_per_unit = ?, base_unit_price = ?, standard_cost = ?, status = ?
    WHERE id = ?
  `).run(body.code, body.description, body.unit, body.default_hs_code_id || null,
    body.packing_kg_per_unit || 0, body.base_unit_price || 0, body.standard_cost || null,
    body.status || 'active', params.id);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(params.id);
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const used = db.prepare(
    'SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?'
  ).get(params.id) as any;

  if (used?.count > 0) {
    db.prepare("UPDATE products SET status = 'inactive' WHERE id = ?").run(params.id);
  } else {
    db.prepare('DELETE FROM products WHERE id = ?').run(params.id);
  }
  return NextResponse.json({ success: true });
}
