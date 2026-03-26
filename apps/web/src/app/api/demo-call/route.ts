import { NextRequest, NextResponse } from 'next/server';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8322387252:AAGIi7OYbwfIit4syQA95XWVZCTlPP96oQc';
const TG_CHAT = '8320254721';

function normaliseUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

async function notifyTelegram(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown' }),
    });
  } catch { /* non-fatal */ }
}

async function saveLeadToRailway(lead: Record<string, string>) {
  try {
    await fetch('https://api-server-production-2a27.up.railway.app/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'aiclozr_api_key_2026_prod' },
      body: JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        company: lead.businessName,
        website: lead.website,
        industry: lead.industry,
        source: 'homepage_demo_call',
        notes: [lead.challenge && `Challenge: ${lead.challenge}`, lead.leadsPerMonth && `Leads/mo: ${lead.leadsPerMonth}`].filter(Boolean).join(' | '),
      }),
    });
  } catch { /* non-fatal */ }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, businessName, website: rawWebsite, industry, challenge, leadsPerMonth } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const website = normaliseUrl(rawWebsite || '');
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

    // Save lead + notify regardless of mock/live mode
    await Promise.all([
      saveLeadToRailway({ name: name || '', phone, email: email || '', businessName: businessName || '', website, industry: industry || '', challenge: challenge || '', leadsPerMonth: leadsPerMonth || '' }),
      notifyTelegram(`🔔 *New demo request!*\n\n👤 ${name || 'Unknown'}\n📞 ${phone}\n📧 ${email || 'n/a'}\n🏢 ${businessName || 'n/a'} (${industry || 'n/a'})\n🌐 ${website || 'n/a'}\n💬 ${challenge || 'n/a'}`),
    ]);

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
