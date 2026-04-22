import { NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const reps = db.prepare("SELECT * FROM sales_reps WHERE status = 'active' ORDER BY name").all();
  return NextResponse.json({ salesReps: reps });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = generateId();
  db.prepare('INSERT INTO sales_reps (id, name, phone, email) VALUES (?, ?, ?, ?)')
    .run(id, body.name, body.phone || '', body.email || '');
  return NextResponse.json({ id }, { status: 201 });
}
