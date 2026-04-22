import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();

  const invoice = db.prepare(`
    SELECT i.*, c.name as customer_name, c.account_number, c.trn as customer_trn,
      c.address as customer_address, c.phone as customer_phone, c.email as customer_email,
      c.contact_person, c.is_export, c.country as customer_country,
      hs.code as hs_code, hs.description as hs_description
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    LEFT JOIN hs_codes hs ON i.hs_code_id = hs.id
    WHERE i.id = ?
  `).get(params.id) as any;

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const items = db.prepare(`
    SELECT ii.*, p.code as product_code
    FROM invoice_items ii JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ? ORDER BY ii.line_order
  `).all(params.id) as any[];

  const company = db.prepare('SELECT * FROM company WHERE id = ?').get('covalent') as any;

  const linkedDns = db.prepare(`
    SELECT dn.dn_number, dn.dispatch_date FROM delivery_notes dn
    JOIN invoice_delivery_notes idn ON dn.id = idn.dn_id WHERE idn.invoice_id = ?
  `).all(params.id) as any[];

  let linkedInvoice = null;
  if (invoice.linked_invoice_id) {
    linkedInvoice = db.prepare('SELECT invoice_number, invoice_date FROM invoices WHERE id = ?').get(invoice.linked_invoice_id) as any;
  }

  const isCN = invoice.document_type === 'credit_note';
  const isZeroRated = invoice.vat_rate_applied === 0;

  const itemRows = items.map((item: any, i: number) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${item.product_code}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:right;">${item.units}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:right;">${item.packing_kg_per_unit}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:right;">${Number(item.total_qty_kg).toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:right;">${formatCurrency(item.taxable_amount)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${isCN ? 'Tax Credit Note' : 'Tax Invoice'} ${invoice.invoice_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; color:#1a1a1a; background:#fff; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto;padding:40px;">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #111;">
    <div>
      <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#111;">${company.company_name}</h1>
      <p style="font-size:12px;color:#666;margin-top:4px;white-space:pre-line;">${company.address || ''}</p>
      ${company.phone ? `<p style="font-size:12px;color:#666;">Tel: ${company.phone}</p>` : ''}
      ${company.email ? `<p style="font-size:12px;color:#666;">${company.email}</p>` : ''}
      <p style="font-size:12px;color:#666;font-weight:600;margin-top:4px;">TRN: ${company.trn || '—'}</p>
    </div>
    <div style="text-align:right;">
      <div style="display:inline-block;background:${isCN ? '#0ea5e9' : '#111'};color:#fff;padding:8px 20px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
        ${isCN ? 'TAX CREDIT NOTE' : 'TAX INVOICE'}
      </div>
      <p style="font-size:22px;font-weight:700;color:#111;margin-top:12px;">${invoice.invoice_number}</p>
      <p style="font-size:12px;color:#666;margin-top:4px;">Date: ${formatDate(invoice.invoice_date)}</p>
      ${!isCN ? `<p style="font-size:12px;color:#666;">Due: ${formatDate(invoice.due_date)}</p>` : ''}
    </div>
  </div>

  ${isZeroRated ? `
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;margin-bottom:20px;">
    <p style="font-size:12px;color:#1e40af;font-weight:600;">Zero-Rated Supply under Article 45 of the UAE VAT Law</p>
  </div>
  ` : ''}

  ${isCN && linkedInvoice ? `
  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
    <p style="font-size:13px;color:#0369a1;font-weight:600;">Against Tax Invoice: ${linkedInvoice.invoice_number} dated ${formatDate(linkedInvoice.invoice_date)}</p>
    <p style="font-size:12px;color:#0369a1;margin-top:4px;">Reason: ${invoice.credit_reason || ''}</p>
  </div>
  ` : ''}

  <!-- Bill To & Details -->
  <div style="display:flex;gap:32px;margin-bottom:28px;">
    <div style="flex:1;">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;">Bill To</p>
      <p style="font-size:15px;font-weight:600;color:#111;">${invoice.customer_name}</p>
      <p style="font-size:12px;color:#666;white-space:pre-line;margin-top:2px;">${invoice.customer_address || ''}</p>
      ${invoice.customer_trn ? `<p style="font-size:12px;color:#666;margin-top:4px;">TRN: ${invoice.customer_trn}</p>` : ''}
      ${invoice.contact_person ? `<p style="font-size:12px;color:#666;">Attn: ${invoice.contact_person}</p>` : ''}
    </div>
    <div style="flex:1;">
      <table style="width:100%;font-size:12px;">
        ${invoice.purchase_order_number ? `<tr><td style="color:#999;padding:3px 0;">PO #</td><td style="text-align:right;color:#333;font-weight:500;">${invoice.purchase_order_number}</td></tr>` : ''}
        ${invoice.payment_term ? `<tr><td style="color:#999;padding:3px 0;">Payment Term</td><td style="text-align:right;color:#333;font-weight:500;">${invoice.payment_term}</td></tr>` : ''}
        ${invoice.inco_term ? `<tr><td style="color:#999;padding:3px 0;">Inco Term</td><td style="text-align:right;color:#333;font-weight:500;">${invoice.inco_term}</td></tr>` : ''}
        ${invoice.shipment_mode ? `<tr><td style="color:#999;padding:3px 0;">Shipment</td><td style="text-align:right;color:#333;font-weight:500;">${invoice.shipment_mode}</td></tr>` : ''}
        ${invoice.hs_code ? `<tr><td style="color:#999;padding:3px 0;">H.S. Code</td><td style="text-align:right;color:#333;font-weight:500;">${invoice.hs_code}</td></tr>` : ''}
        ${linkedDns.length > 0 ? `<tr><td style="color:#999;padding:3px 0;">Delivery Note${linkedDns.length > 1 ? 's' : ''}</td><td style="text-align:right;color:#333;font-weight:500;">${linkedDns.map((d: any) => d.dn_number).join(', ')}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- Line Items -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="background:#fafafa;">
        <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">#</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">Code</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">Description</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">Units</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">Kg/Unit</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">Rate</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;border-bottom:2px solid #eee;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;">
    <table style="width:280px;font-size:13px;">
      <tr><td style="padding:6px 0;color:#666;">Subtotal</td><td style="text-align:right;font-weight:500;">AED ${formatCurrency(invoice.subtotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">VAT (${invoice.vat_rate_applied}%)</td><td style="text-align:right;font-weight:500;">AED ${formatCurrency(invoice.vat_amount)}</td></tr>
      <tr style="border-top:2px solid #111;">
        <td style="padding:12px 0 6px;font-size:15px;font-weight:700;">Total</td>
        <td style="text-align:right;padding:12px 0 6px;font-size:15px;font-weight:700;">AED ${formatCurrency(invoice.total_amount)}</td>
      </tr>
    </table>
  </div>

  ${invoice.customer_notes ? `
  <div style="margin-top:24px;padding:12px 16px;background:#fafafa;border-radius:8px;">
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#999;margin-bottom:4px;">Notes</p>
    <p style="font-size:12px;color:#333;">${invoice.customer_notes}</p>
  </div>
  ` : ''}

  <!-- Bank Details -->
  ${company.bank_name ? `
  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;">
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Bank Details</p>
    <table style="font-size:12px;">
      <tr><td style="color:#666;padding:2px 16px 2px 0;">Bank</td><td style="color:#333;font-weight:500;">${company.bank_name}</td></tr>
      ${company.bank_account_number ? `<tr><td style="color:#666;padding:2px 16px 2px 0;">Account</td><td style="color:#333;font-weight:500;">${company.bank_account_number}</td></tr>` : ''}
      ${company.iban ? `<tr><td style="color:#666;padding:2px 16px 2px 0;">IBAN</td><td style="color:#333;font-weight:500;">${company.iban}</td></tr>` : ''}
      ${company.swift_code ? `<tr><td style="color:#666;padding:2px 16px 2px 0;">SWIFT</td><td style="color:#333;font-weight:500;">${company.swift_code}</td></tr>` : ''}
    </table>
  </div>
  ` : ''}

  <div style="margin-top:40px;text-align:center;font-size:11px;color:#999;">
    <p>This is a computer-generated document. No signature is required.</p>
    <p style="margin-top:2px;">${company.company_name} · TRN: ${company.trn || '—'}</p>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
