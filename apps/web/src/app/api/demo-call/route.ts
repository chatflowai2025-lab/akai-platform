export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { TG_BOT_TOKEN as TG_TOKEN, TG_AARON_CHAT_ID as TG_CHAT, RAILWAY_API_URL, RAILWAY_API_KEY } from '@/lib/server-env';

function normaliseUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1487067273398063244/bcPm17Vawtt7Xq-sri56RRJ2ejIOM5LJj728BX7-6xaQHaOxkmtr8HPs8jDlVP_vBhNm';

async function notifyDiscord(text: string) {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
  } catch { /* non-fatal */ }
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
    await fetch(RAILWAY_API_URL + '/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
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

1. OPEN WITH ENERGY: "Hi ${name || 'there'}, this is Sophie calling from A.K. A.I. — you just asked for a demo and I'm calling you straight away! How are you?" (Wait for their response.)

2. ACKNOWLEDGE THEIR INDUSTRY: "I see you're in ${industry || 'your industry'} — we work with a lot of ${industry || 'businesses like yours'} and the results have been incredible." (Pause, let them engage.)

3. KEY QUESTION — ask ONE of these based on what you know, then listen:
   - If challenge is known: "So I can see your biggest challenge is '${challenge || 'getting more leads'}' — tell me more about that. How long has that been an issue?"
   - If challenge unknown: "Can I ask — what's your biggest challenge right now? Is it finding leads, following up fast enough, or something else?"
   (Really listen. Acknowledge what they say before moving on.)

4. DEMO THE VALUE — be specific: "What A.K. A.I. does is ${pitchLine}. Basically, ${businessName || 'your business'} would never miss another lead."

5. BOOK THE CALL: "I'd love to set up a 15-minute call with Aaron — he's our founder — to show you exactly how this would work for ${businessName || 'your business'}. Are you free sometime this week?"

6. WARM CLOSE: "Perfect — I'll have Aaron reach out to confirm. You're going to love this." Then wrap up warmly.

OBJECTION HANDLING — use these exact responses:
- If they say "I'm not interested": "I completely understand — can I ask what you're currently using to follow up with leads? Just curious." (Then listen — don't pitch again unless they open the door.)
- If they say "I'm busy" or "I don't have time": "Of course — I'll be quick. What's the single biggest thing costing you leads right now?" (One question, then offer to call back if needed.)
- If they ask "How much does it cost?": "Starting at $199 a month — and consider what one extra client per month is worth to your business. Can I send you the details, or would a quick call with Aaron be easier?"
- If they ask how the AI works: "It's all done for you — A.K. A.I. sits on your website and phone line, handles the conversations, and books meetings straight into your calendar. You don't touch it."

RULES:
- ALWAYS say the brand as "A.K. A.I." — four separate letters, each one distinct. Never blend into a word. Never "aki", "ay-kai", or "A-KAI".
- Never say "getakai.ai" — say "get A.K. A.I. dot ai" or just "our website"
- Never read a list of features — have a conversation
- Be warm, genuinely curious, and Australian in tone
- You called THEM. They're already interested. Don't oversell — confirm you solve their problem and get the meeting booked.
- Keep the call under 4 minutes unless they're clearly engaged and want more`;


    // Sophie calls 24/7 — no business hours restriction
    // Save lead + notify, then call immediately
    await Promise.all([
      saveLeadToRailway({ name: name || '', phone, email: email || '', businessName: businessName || '', website, industry: industry || '', challenge: challenge || '', leadsPerMonth: leadsPerMonth || '' }),
      notifyTelegram(
        `🔔 *New demo request!*\n\n👤 ${name || 'Unknown'}\n📞 ${phone}\n📧 ${email || 'n/a'}\n🏢 ${businessName || 'n/a'} (${industry || 'n/a'})\n🌐 ${website || 'n/a'}\n💬 ${challenge || 'n/a'}\n\n📞 Sophie calling now...`
      ),
      notifyDiscord(
        `🔔 **New demo request** — Sophie calling now\n👤 ${name || 'Unknown'} | 📞 ${phone} | 🏢 ${businessName || 'n/a'} (${industry || 'n/a'})\n💬 ${challenge || 'n/a'} | 🌐 ${website || 'n/a'}`
      ),
    ]);

    if (!apiKey) {
      console.warn(`[demo-call] Mock mode — would call ${phone} for ${name || 'unknown'}`);
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
        voice: '857ed371-9b28-4006-99da-a28c41c6fa55', // sophie-australian — stable Bland voice
        first_sentence: `Hi ${name ? name.split(' ')[0] : 'there'}, this is Sophie calling from A.K. A.I. — you just asked for a demo and I'm calling you straight away!`,
        max_duration: 5,
        pronunciation_guide: [
          { word: 'AKAI', pronunciation: 'A.K. A.I.', case_sensitive: false, spaced: true },
          { word: 'AK AI', pronunciation: 'A.K. A.I.', case_sensitive: false, spaced: true },
        ],
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
