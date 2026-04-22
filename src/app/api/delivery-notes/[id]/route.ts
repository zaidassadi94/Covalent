import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const dn = db.prepare(`
    SELECT dn.*, c.name as customer_name, c.account_number, c.address as customer_address
    FROM delivery_notes dn
    JOIN customers c ON dn.customer_id = c.id
    WHERE dn.id = ?
  `).get(params.id) as any;

  if (!dn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const items = db.prepare(`
    SELECT dni.*, p.code as product_code, p.description as product_description
    FROM delivery_note_items dni
    JOIN products p ON dni.product_id = p.id
    WHERE dni.dn_id = ?
    ORDER BY dni.line_order
  `).all(params.id);

  return NextResponse.json({ ...dn, items });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();

  db.prepare(`
    UPDATE delivery_notes SET customer_id = ?, dispatch_date = ?, purchase_order_number = ?,
    inco_term = ?, hs_code_id = ?, notes = ?, status = ?
    WHERE id = ? AND status NOT IN ('invoiced')
  `).run(body.customer_id, body.dispatch_date, body.purchase_order_number || 'Verbal',
    body.inco_term || '', body.hs_code_id || null, body.notes || '', body.status || 'dispatched', params.id);

  if (body.items && Array.isArray(body.items)) {
    db.prepare('DELETE FROM delivery_note_items WHERE dn_id = ?').run(params.id);
    const stmt = db.prepare(`
      INSERT INTO delivery_note_items (id, dn_id, product_id, description, units, packing_kg_per_unit, total_weight_kg, line_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    body.items.forEach((item: any, idx: number) => {
      const weight = (item.units || 0) * (item.packing_kg_per_unit || 0);
      stmt.run(generateId(), params.id, item.product_id, item.description || '', item.units || 1,
        item.packing_kg_per_unit || 0, weight, idx);
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare("UPDATE delivery_notes SET status = 'cancelled' WHERE id = ? AND status != 'invoiced'").run(params.id);
  return NextResponse.json({ success: true });
}
