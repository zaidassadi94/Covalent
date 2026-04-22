import { NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const codes = db.prepare("SELECT * FROM hs_codes WHERE status = 'active' ORDER BY code").all();
  return NextResponse.json({ hsCodes: codes });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = generateId();
  db.prepare('INSERT INTO hs_codes (id, code, description) VALUES (?, ?, ?)').run(id, body.code, body.description);
  return NextResponse.json({ id }, { status: 201 });
}
