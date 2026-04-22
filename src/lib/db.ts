import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'data', 'covalent.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company (
      id TEXT PRIMARY KEY DEFAULT 'covalent',
      company_name TEXT NOT NULL DEFAULT 'Covalent General Trading LLC',
      trn TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      default_vat_rate REAL DEFAULT 5.0,
      currency TEXT DEFAULT 'AED',
      letterhead_image TEXT DEFAULT '',
      invoice_prefix TEXT DEFAULT 'INV-',
      next_invoice_number INTEGER DEFAULT 1001,
      credit_note_prefix TEXT DEFAULT 'CN-',
      next_credit_note_number INTEGER DEFAULT 1,
      dn_prefix TEXT DEFAULT 'DN-',
      next_dn_number INTEGER DEFAULT 1001,
      aging_buckets TEXT DEFAULT '[30, 60, 90, 120]',
      bank_name TEXT DEFAULT '',
      bank_account_number TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      swift_code TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS hs_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales_reps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      user_id TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      account_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      trn TEXT DEFAULT '',
      is_export INTEGER DEFAULT 0,
      country TEXT DEFAULT 'UAE',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      contact_person TEXT DEFAULT '',
      credit_terms_days INTEGER DEFAULT 30,
      payment_term TEXT DEFAULT '30 Days',
      inco_term TEXT DEFAULT 'DDP UAE',
      shipment_mode TEXT DEFAULT 'By Road',
      default_hs_code_id TEXT REFERENCES hs_codes(id),
      sales_rep_id TEXT REFERENCES sales_reps(id),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      unit TEXT DEFAULT 'KGS' CHECK(unit IN ('KGS', 'PCS', 'LTR', 'MTR', 'BOX', 'SET', 'ROL')),
      default_hs_code_id TEXT REFERENCES hs_codes(id),
      packing_kg_per_unit REAL DEFAULT 0,
      base_unit_price REAL DEFAULT 0,
      standard_cost REAL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_product_prices (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      unit_price REAL NOT NULL,
      effective_from TEXT,
      effective_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS delivery_notes (
      id TEXT PRIMARY KEY,
      dn_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      dispatch_date TEXT NOT NULL,
      purchase_order_number TEXT DEFAULT 'Verbal',
      inco_term TEXT DEFAULT '',
      hs_code_id TEXT REFERENCES hs_codes(id),
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'dispatched', 'invoiced', 'cancelled')),
      invoiced_at TEXT,
      invoice_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS delivery_note_items (
      id TEXT PRIMARY KEY,
      dn_id TEXT NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      description TEXT DEFAULT '',
      units INTEGER DEFAULT 1,
      packing_kg_per_unit REAL DEFAULT 0,
      total_weight_kg REAL DEFAULT 0,
      line_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      document_type TEXT DEFAULT 'invoice' CHECK(document_type IN ('invoice', 'credit_note')),
      linked_invoice_id TEXT REFERENCES invoices(id),
      credit_reason TEXT,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      purchase_order_number TEXT DEFAULT '',
      inco_term TEXT DEFAULT '',
      hs_code_id TEXT REFERENCES hs_codes(id),
      payment_term TEXT DEFAULT '',
      shipment_mode TEXT DEFAULT '',
      vat_rate_applied REAL DEFAULT 5.0,
      is_zero_rated INTEGER DEFAULT 0,
      subtotal REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      outstanding_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'partially_paid', 'paid', 'cancelled')),
      internal_notes TEXT DEFAULT '',
      customer_notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      pdf_generated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      description TEXT DEFAULT '',
      packing_kg_per_unit REAL DEFAULT 0,
      units INTEGER DEFAULT 1,
      total_qty_kg REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      price_source TEXT DEFAULT 'base' CHECK(price_source IN ('price_list', 'base', 'manual_override', 'repeat_order')),
      standard_cost_snapshot REAL,
      taxable_amount REAL DEFAULT 0,
      vat_percentage REAL DEFAULT 5.0,
      vat_amount REAL DEFAULT 0,
      line_total REAL DEFAULT 0,
      line_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoice_delivery_notes (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      dn_id TEXT NOT NULL REFERENCES delivery_notes(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'bank_transfer' CHECK(method IN ('cheque', 'bank_transfer', 'cash', 'other')),
      reference TEXT DEFAULT '',
      banking_name TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'operator' CHECK(role IN ('admin', 'operator', 'sales_rep', 'viewer')),
      sales_rep_id TEXT REFERENCES sales_reps(id),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT,
      changes TEXT DEFAULT '{}',
      ip_address TEXT DEFAULT '',
      timestamp TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed company if not exists
  const company = db.prepare('SELECT id FROM company WHERE id = ?').get('covalent');
  if (!company) {
    db.prepare('INSERT INTO company (id) VALUES (?)').run('covalent');
  }

  // Seed HS codes if empty
  const hsCount = db.prepare('SELECT COUNT(*) as count FROM hs_codes').get() as any;
  if (hsCount.count === 0) {
    const hsCodes = [
      { code: '3506 9100', description: 'Hotmelt Adhesive' },
      { code: '3506 1000', description: 'Products suitable for use as glues or adhesives' },
      { code: '3208 2090', description: 'Paints and Varnishes (Acrylic)' },
      { code: '3506 9190', description: 'Adhesive based on polymers' },
      { code: '3905 2100', description: 'PVA Adhesive' },
      { code: '3214 1090', description: 'Glaziers Putty / Sealants' },
      { code: '2710 1990', description: 'Petroleum Oils & Solvents' },
      { code: '3809 9100', description: 'Finishing agents (Textile)' },
    ];
    const stmt = db.prepare('INSERT INTO hs_codes (id, code, description) VALUES (?, ?, ?)');
    for (const hs of hsCodes) {
      stmt.run(uuidv4(), hs.code, hs.description);
    }
  }

  // Seed sales reps if empty
  const repCount = db.prepare('SELECT COUNT(*) as count FROM sales_reps').get() as any;
  if (repCount.count === 0) {
    const reps = [
      { name: 'Ahmad Al Mansouri', phone: '+971 50 123 4567', email: 'ahmad@covalent.ae' },
      { name: 'Ravi Krishnan', phone: '+971 55 987 6543', email: 'ravi@covalent.ae' },
      { name: 'Fahad Bin Saeed', phone: '+971 52 456 7890', email: 'fahad@covalent.ae' },
    ];
    const stmt = db.prepare('INSERT INTO sales_reps (id, name, phone, email) VALUES (?, ?, ?, ?)');
    for (const rep of reps) {
      stmt.run(uuidv4(), rep.name, rep.phone, rep.email);
    }
  }

  // Seed products if empty
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
  if (prodCount.count === 0) {
    const hsCodes = db.prepare('SELECT id, description FROM hs_codes').all() as any[];
    const hsMap: Record<string, string> = {};
    for (const hs of hsCodes) {
      hsMap[hs.description] = hs.id;
    }

    const products = [
      { code: 'ASHWB001', description: 'Hotmelt Adhesive - WB Series', unit: 'KGS', hs: 'Hotmelt Adhesive', packing: 25, price: 12.50, cost: 8.75 },
      { code: 'ASHWB002', description: 'Hotmelt Adhesive - Premium Grade', unit: 'KGS', hs: 'Hotmelt Adhesive', packing: 25, price: 15.00, cost: 10.50 },
      { code: 'APVA001', description: 'PVA White Glue - Standard', unit: 'KGS', hs: 'PVA Adhesive', packing: 20, price: 8.00, cost: 5.20 },
      { code: 'APVA002', description: 'PVA Wood Adhesive - Industrial', unit: 'KGS', hs: 'PVA Adhesive', packing: 25, price: 9.50, cost: 6.10 },
      { code: 'ACRP001', description: 'Acrylic Coating - Clear', unit: 'KGS', hs: 'Paints and Varnishes (Acrylic)', packing: 20, price: 18.00, cost: 12.00 },
      { code: 'SEAL001', description: 'Silicone Sealant - Construction Grade', unit: 'PCS', hs: 'Glaziers Putty / Sealants', packing: 0.28, price: 6.50, cost: 3.80 },
      { code: 'SOLV001', description: 'Industrial Solvent - MEK', unit: 'LTR', hs: 'Petroleum Oils & Solvents', packing: 200, price: 4.20, cost: 2.90 },
      { code: 'POLY001', description: 'Polymer Adhesive - Flexible', unit: 'KGS', hs: 'Adhesive based on polymers', packing: 25, price: 22.00, cost: 15.40 },
      { code: 'TEXT001', description: 'Textile Finishing Agent', unit: 'KGS', hs: 'Finishing agents (Textile)', packing: 50, price: 11.00, cost: 7.50 },
      { code: 'ASHWB003', description: 'Hotmelt Adhesive - Edge Banding', unit: 'KGS', hs: 'Hotmelt Adhesive', packing: 25, price: 14.00, cost: 9.80 },
    ];

    const stmt = db.prepare(
      'INSERT INTO products (id, code, description, unit, default_hs_code_id, packing_kg_per_unit, base_unit_price, standard_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const p of products) {
      stmt.run(uuidv4(), p.code, p.description, p.unit, hsMap[p.hs] || null, p.packing, p.price, p.cost);
    }
  }

  // Seed customers if empty
  const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as any;
  if (custCount.count === 0) {
    const reps = db.prepare('SELECT id, name FROM sales_reps').all() as any[];
    const hsCodes = db.prepare('SELECT id, description FROM hs_codes').all() as any[];
    const hsMap: Record<string, string> = {};
    for (const hs of hsCodes) {
      hsMap[hs.description] = hs.id;
    }

    const customers = [
      { name: 'Al Futtaim Industries', trn: '100234567890003', country: 'UAE', terms: 30, rep: 0, hs: 'Hotmelt Adhesive', address: 'Dubai Industrial City, Dubai', phone: '+971 4 123 4567', email: 'procurement@alfuttaim.ae', contact: 'Mohammed Al Hashimi' },
      { name: 'National Printing Press', trn: '100345678901234', country: 'UAE', terms: 45, rep: 1, hs: 'PVA Adhesive', address: 'Sharjah Industrial Area 15', phone: '+971 6 555 1234', email: 'orders@natprint.ae', contact: 'Suresh Kumar' },
      { name: 'Emirates Packaging LLC', trn: '100456789012345', country: 'UAE', terms: 30, rep: 0, hs: 'Hotmelt Adhesive', address: 'Jebel Ali Free Zone, Dubai', phone: '+971 4 887 6543', email: 'supply@emiratespack.ae', contact: 'Khalid Al Ameri' },
      { name: 'Gulf Metal Coating Co', trn: '100567890123456', country: 'UAE', terms: 60, rep: 2, hs: 'Paints and Varnishes (Acrylic)', address: 'Abu Dhabi Industrial City', phone: '+971 2 444 5678', email: 'purchasing@gmc.ae', contact: 'Rajan Nair' },
      { name: 'RAK Ceramics Supplies', trn: '100678901234567', country: 'UAE', terms: 30, rep: 1, hs: 'Adhesive based on polymers', address: 'Ras Al Khaimah Industrial Zone', phone: '+971 7 222 3456', email: 'procurement@rakcs.ae', contact: 'Fatima Al Zaabi' },
      { name: 'Saudi Chemical Distributors', trn: '', country: 'Saudi Arabia', terms: 60, rep: 2, hs: 'Petroleum Oils & Solvents', address: 'Riyadh Industrial Area', phone: '+966 11 456 7890', email: 'import@saudichem.sa', contact: 'Abdullah Al Ghamdi', export: true },
      { name: 'Oman Packaging Industries', trn: '', country: 'Oman', terms: 45, rep: 0, hs: 'Hotmelt Adhesive', address: 'Muscat Industrial Estate', phone: '+968 2456 7890', email: 'orders@omanpack.om', contact: 'Said Al Busaidi', export: true },
      { name: 'Ajman Furniture Factory', trn: '100789012345678', country: 'UAE', terms: 30, rep: 1, hs: 'Hotmelt Adhesive', address: 'Ajman Industrial Area 2', phone: '+971 6 777 8901', email: 'purchase@ajmanfurn.ae', contact: 'Vikram Singh' },
      { name: 'Dubai Corrugated Box', trn: '100890123456789', country: 'UAE', terms: 30, rep: 0, hs: 'PVA Adhesive', address: 'Al Quoz Industrial Area 3, Dubai', phone: '+971 4 321 0987', email: 'procurement@dcb.ae', contact: 'Hassan Mirza' },
      { name: 'Fujairah Textiles Ltd', trn: '100901234567890', country: 'UAE', terms: 45, rep: 2, hs: 'Finishing agents (Textile)', address: 'Fujairah Free Zone', phone: '+971 9 222 3344', email: 'orders@fujtex.ae', contact: 'Priya Sharma' },
    ];

    const stmt = db.prepare(
      `INSERT INTO customers (id, account_number, name, trn, is_export, country, address, phone, email, contact_person, credit_terms_days, payment_term, inco_term, shipment_mode, default_hs_code_id, sales_rep_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    );

    customers.forEach((c, i) => {
      const acctNum = `C-${String(1001 + i).padStart(4, '0')}`;
      const isExport = (c as any).export ? 1 : 0;
      const incoTerm = isExport ? 'FOB' : 'DDP UAE';
      const shipMode = isExport ? 'By Sea' : 'By Road';
      const payTerm = `${c.terms} Days`;
      stmt.run(
        uuidv4(), acctNum, c.name, c.trn, isExport, c.country, c.address, c.phone, c.email, c.contact,
        c.terms, payTerm, incoTerm, shipMode, hsMap[c.hs] || null, reps[c.rep]?.id || null
      );
    });
  }

  // Seed admin user if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    ).run(uuidv4(), 'Admin', 'admin@covalent.ae', hash, 'admin');
  }
}

export function generateId(): string {
  return uuidv4();
}
