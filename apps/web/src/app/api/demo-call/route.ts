import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, businessName, website, industry, challenge, leadsPerMonth } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const apiKey = process.env.BLAND_API_KEY;

    const taskContext = [
      name && `Their name is ${name}.`,
      businessName && `They run a business called ${businessName}.`,
      industry && `Industry: ${industry}.`,
      challenge && `Their biggest challenge: ${challenge}.`,
      leadsPerMonth && `Current leads per month: ${leadsPerMonth}.`,
      website && `Website: ${website}.`,
      email && `Email: ${email}.`,
    ].filter(Boolean).join(' ');

    const task = `You are AK from AKAI — a friendly, confident AI sales assistant. A prospect just requested a demo call from getakai.ai. ${taskContext} Call them, introduce AKAI (the AI business operating system that handles Sales, Recruitment, Web, Ads, and Social for Australian SMBs), and ask how AKAI can help their specific situation. Book a follow-up call if they're interested.`;

    if (!apiKey) {
      console.log(`[demo-call] Mock mode — would call ${phone} for ${name || 'unknown'}`);
      return NextResponse.json({ success: true, message: 'Demo booked (mock)' });
    }

    const res = await fetch('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phone,
        task,
        voice: 'd66156cc-560b-4080-a195-32d245ad2d1a',
        max_duration: 5,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[demo-call] Bland.ai error:', err);
      return NextResponse.json({ error: 'Call failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[demo-call] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
