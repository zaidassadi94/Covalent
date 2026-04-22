import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = req.nextUrl;
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || 'all';
  const docType = url.searchParams.get('type') || 'all';
  const customerId = url.searchParams.get('customer_id') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: any[] = [];

  if (search) {
    where += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status !== 'all') {
    where += ' AND i.status = ?';
    params.push(status);
  }
  if (docType !== 'all') {
    where += ' AND i.document_type = ?';
    params.push(docType);
  }
  if (customerId) {
    where += ' AND i.customer_id = ?';
    params.push(customerId);
  }

  const countResult = db.prepare(
    `SELECT COUNT(*) as count FROM invoices i JOIN customers c ON i.customer_id = c.id ${where}`
  ).get(...params) as any;

  const invoices = db.prepare(`
    SELECT i.*, c.name as customer_name, c.account_number,
      COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as paid_amount
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ${where}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return NextResponse.json({ invoices, total: countResult?.count || 0, page, limit });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const isCreditNote = body.document_type === 'credit_note';

  const company = db.prepare('SELECT * FROM company WHERE id = ?').get('covalent') as any;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(body.customer_id) as any;

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
  }

  let invoiceNumber: string;
  if (isCreditNote) {
    invoiceNumber = `${company.credit_note_prefix}${String(company.next_credit_note_number).padStart(4, '0')}`;
    db.prepare('UPDATE company SET next_credit_note_number = next_credit_note_number + 1 WHERE id = ?').run('covalent');
  } else {
    invoiceNumber = `${company.invoice_prefix}${String(company.next_invoice_number).padStart(4, '0')}`;
    db.prepare('UPDATE company SET next_invoice_number = next_invoice_number + 1 WHERE id = ?').run('covalent');
  }

  // VAT rate: user can override during invoice creation, default 5%
  const vatRate = body.vat_rate_applied !== undefined ? body.vat_rate_applied : company.default_vat_rate;
  const isZeroRated = vatRate === 0;

  // Calculate totals
  let subtotal = 0;
  const processedItems: any[] = [];

  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      const taxableAmount = (item.total_qty_kg || 0) * (item.unit_price || 0);
      const vatAmount = taxableAmount * (vatRate / 100);
      const lineTotal = taxableAmount + vatAmount;
      subtotal += taxableAmount;

      processedItems.push({
        ...item,
        taxable_amount: Math.round(taxableAmount * 100) / 100,
        vat_percentage: vatRate,
        vat_amount: Math.round(vatAmount * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100,
      });
    }
  }

  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;
  subtotal = Math.round(subtotal * 100) / 100;

  // Credit note validation
  if (isCreditNote) {
    if (!body.linked_invoice_id) {
      return NextResponse.json({ error: 'Credit note must be linked to an invoice' }, { status: 400 });
    }
    if (!body.credit_reason) {
      return NextResponse.json({ error: 'Credit note reason is required' }, { status: 400 });
    }
    const linkedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(body.linked_invoice_id) as any;
    if (!linkedInvoice) {
      return NextResponse.json({ error: 'Linked invoice not found' }, { status: 400 });
    }
    if (totalAmount > linkedInvoice.outstanding_amount) {
      return NextResponse.json({
        error: `Credit note amount (AED ${totalAmount.toFixed(2)}) cannot exceed outstanding amount of linked invoice (AED ${linkedInvoice.outstanding_amount.toFixed(2)}).`
      }, { status: 400 });
    }
  }

  const id = generateId();
  const dueDate = body.due_date || (() => {
    const d = new Date(body.invoice_date);
    d.setDate(d.getDate() + (customer.credit_terms_days || 30));
    return d.toISOString().split('T')[0];
  })();

  db.prepare(`
    INSERT INTO invoices (id, invoice_number, document_type, linked_invoice_id, credit_reason,
      customer_id, invoice_date, due_date, purchase_order_number, inco_term, hs_code_id,
      payment_term, shipment_mode, vat_rate_applied, is_zero_rated, subtotal, vat_amount,
      total_amount, outstanding_amount, status, internal_notes, customer_notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, invoiceNumber, body.document_type || 'invoice',
    body.linked_invoice_id || null, body.credit_reason || null,
    body.customer_id, body.invoice_date, dueDate,
    body.purchase_order_number || '', body.inco_term || customer.inco_term || '',
    body.hs_code_id || customer.default_hs_code_id || null,
    body.payment_term || customer.payment_term || '',
    body.shipment_mode || customer.shipment_mode || '',
    vatRate, isZeroRated ? 1 : 0,
    subtotal, vatAmount, totalAmount,
    isCreditNote ? 0 : totalAmount,
    'open',
    body.internal_notes || '', body.customer_notes || '',
    body.created_by || null
  );

  // Insert line items
  if (processedItems.length > 0) {
    const stmt = db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, product_id, description, packing_kg_per_unit,
        units, total_qty_kg, unit_price, price_source, standard_cost_snapshot,
        taxable_amount, vat_percentage, vat_amount, line_total, line_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    processedItems.forEach((item, idx) => {
      stmt.run(generateId(), id, item.product_id, item.description || '',
        item.packing_kg_per_unit || 0, item.units || 1, item.total_qty_kg || 0,
        item.unit_price || 0, item.price_source || 'base', item.standard_cost_snapshot || null,
        item.taxable_amount, item.vat_percentage, item.vat_amount, item.line_total, idx);
    });
  }

  // Link delivery notes
  if (body.dn_ids && Array.isArray(body.dn_ids)) {
    const linkStmt = db.prepare('INSERT INTO invoice_delivery_notes (id, invoice_id, dn_id) VALUES (?, ?, ?)');
    const updateDn = db.prepare("UPDATE delivery_notes SET status = 'invoiced', invoiced_at = datetime('now'), invoice_id = ? WHERE id = ?");
    for (const dnId of body.dn_ids) {
      linkStmt.run(generateId(), id, dnId);
      updateDn.run(id, dnId);
    }
  }

  // If credit note, reduce linked invoice's outstanding
  if (isCreditNote && body.linked_invoice_id) {
    const linkedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(body.linked_invoice_id) as any;
    const newOutstanding = Math.round((linkedInvoice.outstanding_amount - totalAmount) * 100) / 100;
    const newStatus = newOutstanding <= 0 ? 'paid' : linkedInvoice.status === 'open' && newOutstanding < linkedInvoice.total_amount ? 'partially_paid' : linkedInvoice.status;

    db.prepare('UPDATE invoices SET outstanding_amount = ?, status = ? WHERE id = ?')
      .run(Math.max(0, newOutstanding), newStatus, body.linked_invoice_id);
  }

  const invoice = db.prepare(`
    SELECT i.*, c.name as customer_name
    FROM invoices i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `).get(id);

  return NextResponse.json(invoice, { status: 201 });
}
