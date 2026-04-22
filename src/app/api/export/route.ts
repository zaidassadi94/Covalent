import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatDateCSV(d: string): string {
  if (!d) return '';
  const date = new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate().toString().padStart(2,'0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function toCSV(headers: string[], rows: any[][]): string {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const type = req.nextUrl.searchParams.get('type') || 'invoices';
  const dateFrom = req.nextUrl.searchParams.get('date_from') || '';
  const dateTo = req.nextUrl.searchParams.get('date_to') || '';

  let csv = '';
  let filename = '';

  switch (type) {
    case 'customers': {
      const rows = db.prepare(`
        SELECT c.account_number, c.name, c.trn, c.country, c.address, c.phone, c.email,
          c.contact_person, c.credit_terms_days, c.payment_term, c.inco_term, sr.name as sales_rep
        FROM customers c LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
        WHERE c.status = 'active' ORDER BY c.name
      `).all() as any[];
      csv = toCSV(
        ['Account #', 'Name', 'TRN', 'Country', 'Address', 'Phone', 'Email', 'Contact', 'Credit Days', 'Payment Term', 'Inco Term', 'Sales Rep'],
        rows.map(r => [r.account_number, r.name, r.trn, r.country, r.address, r.phone, r.email, r.contact_person, r.credit_terms_days, r.payment_term, r.inco_term, r.sales_rep])
      );
      filename = 'customers.csv';
      break;
    }
    case 'products': {
      const rows = db.prepare(`
        SELECT p.code, p.description, p.unit, hs.code as hs_code, p.packing_kg_per_unit, p.base_unit_price, p.standard_cost
        FROM products p LEFT JOIN hs_codes hs ON p.default_hs_code_id = hs.id
        WHERE p.status = 'active' ORDER BY p.code
      `).all() as any[];
      csv = toCSV(
        ['Code', 'Description', 'Unit', 'HS Code', 'Packing Kg/Unit', 'Unit Price', 'Standard Cost'],
        rows.map(r => [r.code, r.description, r.unit, r.hs_code, r.packing_kg_per_unit, r.base_unit_price, r.standard_cost])
      );
      filename = 'products.csv';
      break;
    }
    case 'invoices': {
      let where = "WHERE i.document_type = 'invoice'";
      const params: any[] = [];
      if (dateFrom) { where += ' AND i.invoice_date >= ?'; params.push(dateFrom); }
      if (dateTo) { where += ' AND i.invoice_date <= ?'; params.push(dateTo); }

      const rows = db.prepare(`
        SELECT i.invoice_number, c.name as customer, i.invoice_date, i.due_date, i.status,
          i.subtotal, i.vat_rate_applied, i.vat_amount, i.total_amount, i.outstanding_amount, i.purchase_order_number
        FROM invoices i JOIN customers c ON i.customer_id = c.id
        ${where} ORDER BY i.invoice_date DESC
      `).all(...params) as any[];
      csv = toCSV(
        ['Invoice #', 'Customer', 'Date', 'Due Date', 'Status', 'Subtotal', 'VAT Rate %', 'VAT Amount', 'Total', 'Outstanding', 'PO #'],
        rows.map(r => [r.invoice_number, r.customer, formatDateCSV(r.invoice_date), formatDateCSV(r.due_date), r.status, r.subtotal, r.vat_rate_applied, r.vat_amount, r.total_amount, r.outstanding_amount, r.purchase_order_number])
      );
      filename = 'invoices.csv';
      break;
    }
    case 'credit_notes': {
      let where = "WHERE i.document_type = 'credit_note'";
      const params: any[] = [];
      if (dateFrom) { where += ' AND i.invoice_date >= ?'; params.push(dateFrom); }
      if (dateTo) { where += ' AND i.invoice_date <= ?'; params.push(dateTo); }

      const rows = db.prepare(`
        SELECT i.invoice_number as cn_number, c.name as customer, i.invoice_date, i.credit_reason,
          li.invoice_number as linked_invoice, i.subtotal, i.vat_amount, i.total_amount, i.status
        FROM invoices i JOIN customers c ON i.customer_id = c.id
        LEFT JOIN invoices li ON i.linked_invoice_id = li.id
        ${where} ORDER BY i.invoice_date DESC
      `).all(...params) as any[];
      csv = toCSV(
        ['CN #', 'Customer', 'Date', 'Reason', 'Against Invoice', 'Subtotal', 'VAT', 'Total', 'Status'],
        rows.map(r => [r.cn_number, r.customer, formatDateCSV(r.invoice_date), r.credit_reason, r.linked_invoice, r.subtotal, r.vat_amount, r.total_amount, r.status])
      );
      filename = 'credit_notes.csv';
      break;
    }
    case 'payments': {
      let where = 'WHERE 1=1';
      const params: any[] = [];
      if (dateFrom) { where += ' AND p.payment_date >= ?'; params.push(dateFrom); }
      if (dateTo) { where += ' AND p.payment_date <= ?'; params.push(dateTo); }

      const rows = db.prepare(`
        SELECT p.payment_date, i.invoice_number, c.name as customer, p.method, p.reference, p.banking_name, p.amount, p.notes
        FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN customers c ON i.customer_id = c.id
        ${where} ORDER BY p.payment_date DESC
      `).all(...params) as any[];
      csv = toCSV(
        ['Date', 'Invoice #', 'Customer', 'Method', 'Reference', 'Bank', 'Amount', 'Notes'],
        rows.map(r => [formatDateCSV(r.payment_date), r.invoice_number, r.customer, r.method, r.reference, r.banking_name, r.amount, r.notes])
      );
      filename = 'payments.csv';
      break;
    }
    case 'vat_summary': {
      let where = "WHERE i.status != 'cancelled'";
      const params: any[] = [];
      if (dateFrom) { where += ' AND i.invoice_date >= ?'; params.push(dateFrom); }
      if (dateTo) { where += ' AND i.invoice_date <= ?'; params.push(dateTo); }

      const summary = db.prepare(`
        SELECT
          SUM(CASE WHEN document_type='invoice' AND vat_rate_applied > 0 THEN subtotal ELSE 0 END) as standard_rated_supplies,
          SUM(CASE WHEN document_type='invoice' AND vat_rate_applied > 0 THEN vat_amount ELSE 0 END) as vat_on_standard,
          SUM(CASE WHEN document_type='invoice' AND vat_rate_applied = 0 THEN subtotal ELSE 0 END) as zero_rated_supplies,
          SUM(CASE WHEN document_type='credit_note' AND vat_rate_applied > 0 THEN subtotal ELSE 0 END) as standard_rated_cn,
          SUM(CASE WHEN document_type='credit_note' AND vat_rate_applied > 0 THEN vat_amount ELSE 0 END) as vat_on_cn,
          SUM(CASE WHEN document_type='credit_note' AND vat_rate_applied = 0 THEN subtotal ELSE 0 END) as zero_rated_cn
        FROM invoices i ${where}
      `).get(...params) as any;

      csv = toCSV(
        ['Category', 'Amount (AED)', 'VAT (AED)'],
        [
          ['Standard Rated Supplies (5%)', summary?.standard_rated_supplies || 0, summary?.vat_on_standard || 0],
          ['Zero Rated Supplies (0%)', summary?.zero_rated_supplies || 0, 0],
          ['Credit Notes - Standard Rated', summary?.standard_rated_cn || 0, summary?.vat_on_cn || 0],
          ['Credit Notes - Zero Rated', summary?.zero_rated_cn || 0, 0],
          ['Net VAT Due', '', (summary?.vat_on_standard || 0) - (summary?.vat_on_cn || 0)],
        ]
      );
      filename = 'vat_summary.csv';
      break;
    }
    default:
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
