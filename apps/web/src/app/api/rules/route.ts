import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
const API_KEY = process.env.RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';

interface Rule {
  name: string;
  trigger: string;
  action: string;
  notify?: boolean;
}

interface RulesRequest {
  userId: string;
  rule: Rule;
}

export async function POST(req: NextRequest) {
  try {
    const body: RulesRequest = await req.json();
    const { userId, rule } = body;

    if (!userId || !rule) {
      return NextResponse.json({ error: 'userId and rule are required' }, { status: 400 });
    }

    if (!rule.name || !rule.trigger || !rule.action) {
      return NextResponse.json({ error: 'rule must include name, trigger, and action' }, { status: 400 });
    }

    const res = await fetch(`${RAILWAY_API}/api/email/rules/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(rule),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`[/api/rules] Railway returned ${res.status}: ${errorText}`);
      return NextResponse.json({ error: 'Failed to save rule', details: errorText }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[/api/rules]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
