export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export interface Prospect {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  status: string;
  subject?: string;
  industry?: string;
  location?: string;
}

// GET /api/prospects?userId=xxx — returns user-specific prospects from Firestore
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ prospects: [], total: 0, message: 'userId required' });
  }

  try {
    // Try to fetch from Railway (user-scoped prospects)
    const RAILWAY = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
    const API_KEY = process.env.NEXT_PUBLIC_RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';
    
    const res = await fetch(`${RAILWAY}/api/analytics/prospects/${userId}`, {
      headers: { 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Railway unavailable — return empty
  }

  // No prospects yet — return empty so UI shows the generate prompt
  return NextResponse.json({ prospects: [], total: 0 });
}

// PATCH /api/prospects — update a prospect's status
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, userId } = await req.json();
    const RAILWAY = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
    const API_KEY = process.env.NEXT_PUBLIC_RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';
    
    if (userId) {
      await fetch(`${RAILWAY}/api/analytics/prospects/${userId}/${id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ status }),
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, id, status });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
