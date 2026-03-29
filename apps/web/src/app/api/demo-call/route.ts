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
    await fetch((process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app')+'/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod' },
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

    const industryPitch: Record<string, string> = {
      'Trades': 'we put an AI agent on your website and phone line that captures every enquiry, qualifies the lead, and books a quote in your calendar — no more missed calls or slow follow-ups',
      'Real Estate': 'we instantly follow up every property enquiry, qualify buyers and sellers, and book inspections automatically — so you never lose a lead to a faster agent',
      'Legal': 'we respond to every new enquiry within 60 seconds, qualify the case type, and book a consultation — so your lawyers only spend time on the right clients',
      'Medical': 'we handle appointment requests 24/7, remind patients automatically, and reduce no-shows — so your front desk can focus on in-clinic care',
      'Medical & Health': 'we handle appointment requests 24/7, remind patients automatically, and reduce no-shows — so your front desk can focus on in-clinic care',
      'Finance': 'we qualify every lead against your criteria, book discovery calls automatically, and follow up until they convert — no lead left behind',
      'Retail': 'we re-engage past customers, follow up on abandoned carts, and run personalised outreach campaigns — all on autopilot',
      'Recruitment': 'we screen every candidate application in seconds using AI, rank them against your job criteria, and book interviews automatically — so you fill roles up to 3x faster',
      'Hospitality': 'we capture every booking enquiry instantly, follow up with guests who haven\'t confirmed, and automatically request reviews after their visit — boosting both occupancy and reputation',
      'Construction': 'we respond to every quote request within 60 seconds, follow up until they convert, and make sure zero leads slip through the cracks while your team is on-site',
      'Technology': 'we automate your entire sales pipeline — from lead capture to qualification to booked demos — so your team only talks to warm, ready-to-buy prospects',
    };

    const pitchLine = industryPitch[industry || ''] || 'we automate your lead follow-up, qualify prospects instantly, and book meetings in your calendar — your business runs on autopilot while you focus on closing';

    const task = `You are Sophie — a warm, confident Australian AI sales consultant for AKAI. You are calling ${name || 'there'} who JUST submitted a demo request on getakai.ai — you are calling them straight away.

THEIR DETAILS (you already have these — do NOT ask for them again):
${taskContext}

YOUR GOAL: Have an energetic, natural conversation that ends with a 15-minute meeting booked with Aaron.

CALL FLOW — follow this closely but keep it conversational:

1. OPEN WITH ENERGY: "Hi ${name || 'there'}, this is Sophie calling from A-KAI — you just asked for a demo and I'm calling you straight away! How are you?" (Wait for their response.)

2. ACKNOWLEDGE THEIR INDUSTRY: "I see you're in ${industry || 'your industry'} — we work with a lot of ${industry || 'businesses like yours'} and the results have been incredible." (Pause, let them engage.)

3. KEY QUESTION — ask ONE of these based on what you know, then listen:
   - If challenge is known: "So I can see your biggest challenge is '${challenge || 'getting more leads'}' — tell me more about that. How long has that been an issue?"
   - If challenge unknown: "Can I ask — what's your biggest challenge right now? Is it finding leads, following up fast enough, or something else?"
   (Really listen. Acknowledge what they say before moving on.)

4. DEMO THE VALUE — be specific: "What AKAI does is ${pitchLine}. Basically, ${businessName || 'your business'} would never miss another lead."

5. BOOK THE CALL: "I'd love to set up a 15-minute call with Aaron — he's our founder — to show you exactly how this would work for ${businessName || 'your business'}. Are you free sometime this week?"

6. WARM CLOSE: "Perfect — I'll have Aaron reach out to confirm. You're going to love this." Then wrap up warmly.

OBJECTION HANDLING — use these exact responses:
- If they say "I'm not interested": "I completely understand — can I ask what you're currently using to follow up with leads? Just curious." (Then listen — don't pitch again unless they open the door.)
- If they say "I'm busy" or "I don't have time": "Of course — I'll be quick. What's the single biggest thing costing you leads right now?" (One question, then offer to call back if needed.)
- If they ask "How much does it cost?": "Starting at $199 a month — and consider what one extra client per month is worth to your business. Can I send you the details, or would a quick call with Aaron be easier?"
- If they ask how the AI works: "It's all done for you — AKAI sits on your website and phone line, handles the conversations, and books meetings straight into your calendar. You don't touch it."

RULES:
- Pronounce AKAI as "ay-kai" (two syllables)
- Never say "getakai.ai" — say "get ay-kai dot ai" or just "our website"
- Never read a list of features — have a conversation
- Be warm, genuinely curious, and Australian in tone
- You called THEM. They're already interested. Don't oversell — confirm you solve their problem and get the meeting booked.
- Keep the call under 4 minutes unless they're clearly engaged and want more`;


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
