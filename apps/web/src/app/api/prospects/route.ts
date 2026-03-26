import { NextRequest, NextResponse } from 'next/server';
import prospectsData from './data.json';

export interface Prospect {
  id: number;
  name: string;
  email: string;
  phone: string;
  website: string;
  status: string;
  subject: string;
}

// GET /api/prospects — returns all AKAI prospects
export async function GET() {
  return NextResponse.json({ prospects: prospectsData, total: prospectsData.length });
}

// PATCH /api/prospects — update a prospect's status
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    // In production this would write to Firestore/Railway — for now just ack
    return NextResponse.json({ ok: true, id, status });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
