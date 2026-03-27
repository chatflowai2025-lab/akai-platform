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

    const task = `You are Sophie — a warm, confident Australian AI sales assistant for AKAI. You are calling a prospect who just requested a demo at getakai.ai.

THEIR DETAILS (you already have these — do NOT ask for them again):
${taskContext}

YOUR GOAL: Have a natural 2-minute conversation that ends with them going to getakai.ai to sign up.

CALL FLOW:
1. Greet them by first name. Keep it warm and human — not a corporate pitch.
2. Reference their specific challenge: "${challenge || 'getting more qualified leads'}". Show you understand their world.
3. In 1-2 sentences, explain what AKAI does in plain English: "We basically run your sales and marketing on autopilot — finding leads, calling them, qualifying them, and booking meetings. You just close."
4. If they want to know more, go deeper on whichever module fits their challenge best.
5. If they're ready to move: "Perfect — head to getakai.ai and sign up free. Takes 5 minutes and I'll be there to help you set everything up."
6. Do NOT ask for their email, phone number, or any details you already have.
7. Do NOT promise to send emails or login details — just direct them to the site.
8. Keep it under 3 minutes. Be warm, casual, Australian in tone.

Remember: you called THEM. They're already interested. Don't oversell — just confirm you can solve their problem and get them to sign up.`;


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
      // Lead already captured via Telegram — don't surface a broken state to the user
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[demo-call] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
