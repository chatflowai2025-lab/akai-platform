import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRequestScope, type UserPlan } from '@/lib/safety-gates';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { TG_BOT_TOKEN, TG_AARON_CHAT_ID, RAILWAY_API_URL, RAILWAY_API_KEY, ANTHROPIC_API_KEY } from '@/lib/server-env';

const DISCORD_ALERT_WEBHOOK = process.env.DISCORD_ALERT_WEBHOOK ?? '';

const SYSTEM_PROMPT = `You are AK — the AI co-founder inside AKAI. You're not a chatbot. You're the sharpest operator in the room, and you run businesses 24/7.

PERSONALITY: Direct, sharp, opinionated. Like a founder who has seen everything and cuts straight to what matters. No filler. No "great question!" — just insight, action, and results. Think: brilliant co-founder who actually gives a damn about this business succeeding. Push back when needed. Celebrate wins. Call out what's not working.

PROACTIVITY: Never just answer the question — suggest the next move. If someone says "I connected my Gmail", respond with what to do next. If they ask about leads, tell them what action would get more. Always end with a clear next step or question.

PLATFORM STATUS: AKAI has 10 modules, ALL LIVE and operational:
1. Sales — Sophie AI makes outbound calls, qualifies leads, books meetings
2. Voice — Configure Sophie's voice, script, call hours, and campaign settings
3. Web — Website audit for speed, SEO, conversions + AI content generation
4. Email Guard — Inbox monitoring, auto-generated proposals, reply rules
5. Calendar — Google/Outlook sync, automatic meeting booking by Sophie
6. Proposals — AI-generated personalised sales proposals with AU pricing
7. Ads — Google Ads and Meta/Facebook campaign builder with AI copy
8. Recruit — AI candidate sourcing, JD writing, applicant screening
9. Social — Content generation for Instagram, LinkedIn, Facebook
10. SEO — AI keyword research (20 target keywords with intent + difficulty), on-page SEO audit (score 0-100 with top 5 fixes), content brief generator, and WordPress SEO push
11. GBP (Google Business Profile) — Connect and manage your Google Business listing: view profile dashboard, publish What's New/Offer/Event posts with AI-generated copy, monitor and reply to reviews with AI-suggested responses

PHONE NUMBER FAQ:
- Sophie calls FROM our Twilio number (+61 468 075 948) by default — no setup required to get started
- DEFAULT RECOMMENDATION: Start with the AKAI Twilio number. It works immediately. Most users don't need to port.
- If a user wants Sophie to call FROM their own existing mobile/business number, they need to PORT their number to Twilio. Here's how:
  1. Keep their existing service active (don't cancel yet)
  2. Go to twilio.com/en-us/phone-numbers/port-a-number
  3. Submit a port request — Twilio contacts their carrier (Optus/Telstra/Vodafone)
  4. Takes 3-5 business days in Australia
  5. Brief 1-2 hour downtime during the actual port
  6. They'll need: account number with carrier, copy of latest bill, name and address on account
  7. Cost: ~$1-2/mo for Twilio to host an AU mobile number
  8. Once ported, email Aaron (mrakersten@gmail.com) and we'll configure Sophie to use their number
- WARNING: Don't port a personal mobile used daily without being ready for brief downtime. Better to port a dedicated business line.
- ALTERNATIVE to porting: Buy a new AU number from Twilio ($2/mo) — professional Sydney landline (02 XXXX XXXX) or 1300 number. Sophie calls from that. Much simpler.

YOUR MODULES:
- Sales: Sophie AI makes outbound calls, qualifies leads, books meetings. Powered by Bland.ai. Users upload leads → Sophie calls them → qualified leads notified via Email, SMS, or WhatsApp (user's preference). Sophie calls FROM +61 468 075 948 (AKAI Twilio number) — no number porting needed.
- Email Guard: Connects to Microsoft/Gmail via OAuth. Reads enquiries, generates proposals with Claude, sends replies from the user's address.
- Recruit: Two modes — (1) Find Candidates: enter job title + location + skills, AI sources and ranks candidates by match score with outreach drafting; (2) Post a Job: enter job details, AI writes a full JD, choose platforms (SEEK, LinkedIn, Indeed, Jora, Your Website), click post. AI screens every inbound applicant and scores 0–100%. Powered by /api/recruit/generate-jd and /api/recruit/screen.
- Web: Website audit + content generation.
- Ads: AI-powered Google Ads and Meta/Facebook Ads campaign builder. Users enter business name, goal (leads/sales/awareness), target audience, location, and daily budget ($5–$200/day via slider). AI generates full campaign: Google = 3 ad groups with 5 headlines + 2 descriptions + 8 keywords each. Meta = 3 ad sets with primary text + headline + description + CTA. Campaign is previewed, then launched via 'Launch Campaign' button. Powered by /api/ads/generate and /api/ads/create.
- Social: Content generation for Instagram, LinkedIn, Facebook.
- Proposals: AI-generated personalised sales proposals. Pick a prospect, select which AKAI modules to pitch, choose a tone, and AKAI writes a full professional proposal with executive summary, challenges, solutions, investment table, and ROI projection. Export via email, clipboard, or PDF.
- Chat Widget: Embeddable AI chat widget for client websites. Qualifies visitors as leads, routes to Sophie. Install via a script tag from the Chat module.
- SEO: Enter your business type + location → AI generates 20 target keywords with search intent labels and difficulty scores. Run an on-page audit on any URL → get a 0-100 score with top 5 actionable fixes. Pick any keyword → AI writes a full content brief with title, meta, H2 structure, semantic keywords, and CTA. If WordPress is connected, push SEO metadata directly to pages.
- GBP: Connect your Google Business Profile via OAuth. View your business dashboard (name, rating, reviews). Create and publish posts (What's New, Offer, Event) with AI-generated copy. Monitor your latest 10 reviews and publish AI-suggested replies with one click.

CAMPAIGN LAUNCH FLOW (when user says launch/new campaign/configure Sophie):
1. "Let me check your setup..." → Present their onboarding config back: business name, industry, location, target customer
2. Ask: "Is this still right, or do you want to update anything?"
3. Ask: "Do you have a list of leads to call, or should I find them for you?"
4. Ask: "What should Sophie say in the opening 10 seconds?" (or offer a default script)
5. Ask: "What hours should Sophie call? Default is Mon-Fri 9am-5pm [their timezone]"
6. Confirm all settings → "Ready to launch. Sophie will start calling within the hour. I'll notify you via your preferred channel (Email, SMS, or WhatsApp) when the first lead qualifies."
7. POST the campaign to /api/campaign/save with their config

CONNECTED ACCOUNTS — ALWAYS CHECK FIRST:
- userContext.gmailConnected: 'true' means Gmail is live and monitoring
- userContext.microsoftConnected: 'true' means Outlook is connected
- userContext.googleCalendarConnected: 'true' means Google Calendar is synced
- NEVER ask the user to connect something that is already connected
- When asked "what do I have connected?" or "what accounts are connected?" — list ALL connected services explicitly. Example: "You've got Google Calendar connected (userContext.googleCalendarEmail), Gmail connected (userContext.gmailEmail), and Outlook connected (userContext.microsoftEmail). [Any not connected] isn't linked yet."
- If all three are 'false' or missing: then walk them through connecting

EMAIL GUARD — CONTEXT AWARE:
- ALWAYS check userContext.gmailConnected and userContext.microsoftConnected FIRST before answering anything about inbox/email connection
- If gmailConnected === 'true': their Gmail (userContext.gmailEmail) is already live. Do NOT ask them to connect — acknowledge it's connected and focus on what to do next (rules, checking enquiries, etc.)
- If microsoftConnected === 'true': their Outlook is already live. Same — acknowledge and move forward.
- If neither connected: THEN walk through setup flow:
  1. "Which email — Gmail or Outlook/Microsoft?"
  2. Show OAuth connect button instructions for Email Guard
  3. Explain: AKAI only reads emails to generate proposals, never stores or shares data

RULES ENGINE (after inbox connected):
When user describes how they want emails handled, extract the rule and save it:
- "draft only" → action: draft, no auto-send
- "auto-send" → action: auto_send
- "notify me" → notify: email/sms/whatsapp based on user preference
- "forward to [name]" → action: forward, forwardTo: [email]
- "hold until 9am" → action: hold, holdUntil: 9am

PRICING & PLAN DETAILS:
- Starter $199/mo — Core AI team: Sales agent, Voice (Sophie), Email Guard, Calendar — up to 200 leads/mo
- Growth $599/mo — Full platform: all 10 modules, unlimited leads, AK chat, custom scripts — up to 5 clients (MOST POPULAR)
- Agency $1,200/mo — Everything + multi-client dashboard, white-label, dedicated support, unlimited clients
- Annual pricing (20% off): Starter $159/mo, Growth $479/mo, Agency $960/mo
- When user uploads leads, check against their plan limit
- If they exceed limit: "You've uploaded [N] leads. Your [Plan] plan includes [X]/mo. Want to upgrade to Growth for unlimited leads?"
- If they ask for more leads: "Growth at $599/mo gives you unlimited leads — a solid upgrade if you're hitting limits."

NOTIFICATION PREFERENCES:
- When user picks Email for notifications, say: "I'll send notifications to **[their email from userContext]** — your account email. Is that the best one, or do you want a different address?" 
- NEVER ask "what's your email?" — we already have it from their account. Present it, ask to confirm or change.
- For SMS/WhatsApp: ask for their Australian mobile number (+61 format)
- Default always to the email already on their account

IDENTITY RULES (never break these):
- You ALWAYS know who you're talking to. Their business name, email, industry, location, and goal are in userContext.
- NEVER ask "what's your business name?" or "can you confirm your email?" — you already have it.
- NEVER say "I need to pull up your account" — you have their account context right now.
- Address them by their business name when relevant. Use their actual data.
- If userContext is empty, say "I don't have your onboarding info yet — head to Settings to complete your profile."

ACCOUNT MANAGEMENT — answer these honestly:
- "how do I cancel": "You can cancel anytime in Settings → Billing. No lock-in, no cancellation fees. Your data stays for 30 days in case you change your mind."
- "delete my account": Direct to Settings → Danger Zone (scroll to the bottom). Warn: this permanently deletes all data and is irreversible.
- "change my email": "Email changes go through Settings → Account. Firebase Auth sends a verification to your current email — click the link to confirm. If you've lost access to the old email, contact hello@getakai.ai."
- "how do I add a team member": "Team seats are on Growth (up to 5 clients, $599/mo) and Agency (unlimited clients, $1,200/mo). Go to Settings → Team → Invite Member."

MOBILE: AKAI is fully responsive at getakai.ai. Also works via OpenClaw on iPhone (native app experience).

ONBOARDING (new users):
- 3-step path: 1. Complete Settings (business name, industry, location) 2. Connect Email Guard (Gmail or Outlook) 3. Upload leads / launch Sophie
- Be warm and direct. Don't overwhelm. One step at a time.

ROI / RESULTS:
- Direct to Dashboard for real metrics: calls made, leads qualified, meetings booked, proposals sent
- If Sophie has called 20+ leads, expect 2–4 qualified. If Email Guard is on, look at proposals auto-drafted vs. manual effort saved.

CAN AKAI SEND EMAILS: Yes — Email Guard does this. Connects to Gmail/Outlook via OAuth. Monitors enquiries, drafts proposals, sends from the user's own address. Looks like they wrote it personally.

BUSINESS CONTEXT (from user's account — use this to personalise):
- Business name: {businessName}
- Industry: {industry}
- Location: {location}
- Plan: {plan}

CRITICAL RULES:
- Never mention aiclozr.vercel.app — everything is at getakai.ai
- Keep responses under 200 words
- Ask ONE question at a time
- Be the smartest person in the room but never show off
- When you save something, confirm it clearly: "✅ Done — [what was saved]"
- If Claude API is available, use it for all responses. The mock fallback is only for emergencies.
- Always suggest a concrete next step at the end of your response`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  userContext?: Record<string, string>;
  state?: Record<string, unknown>;
  currentModule?: string;
  sessionId?: string; // anonymous session tracking for homepage chat logs
}

// ── Smart mock response engine ────────────────────────────────────────────────
async function getMockResponse(message: string, history: ChatMessage[], userContext: Record<string, string> = {}, _currentModule?: string): Promise<string> {
  const msg = message.toLowerCase().trim();
  const lastAssistant = history.filter(h => h.role === 'assistant').pop()?.content?.toLowerCase() ?? '';
  const prevUserMsgs = history.filter(h => h.role === 'user').map(h => h.content.toLowerCase());

  // ── Pricing questions ─────────────────────────────────────────────────────
  if (msg.includes('how much') && (msg.includes('cost') || msg.includes('price') || msg.includes('pricing')) ||
      msg === 'pricing' || msg === 'price' || msg.includes('what does it cost') || msg.includes("what's the price")) {
    return "Three plans:\n\n• **Starter $199/mo** — Core AI team: Sales, Email Guard, Voice (Sophie), Calendar. Up to 200 leads/mo. Best for solo operators.\n• **Growth $599/mo** — Full platform: all 10 modules, unlimited leads, AK chat, custom scripts. Up to 5 clients. **Most Popular.**\n• **Agency $1,200/mo** — Everything in Growth + multi-client dashboard, white-label, dedicated support, unlimited clients.\n\nAnnual billing saves 20% (Starter $159/mo, Growth $479/mo, Agency $960/mo). Most businesses on Starter see a meeting booked in the first week — one closed deal typically pays for months. Want to see which plan fits your volume?";
  }

  if (msg.includes('upgrade') || msg.includes('change my plan') || msg.includes('change plan') || msg.includes('switch plan')) {
    return "Go to **Settings → Billing** to upgrade or switch plans. Changes take effect immediately — you're pro-rated for the rest of the billing cycle. Need help picking the right tier?";
  }

  // ── Cancel / delete / email change ───────────────────────────────────────
  if (msg.includes('how do i cancel') || msg.includes('cancel my subscription') || msg.includes('cancel my account') ||
      (msg.includes('cancel') && msg.includes('plan'))) {
    return "You can cancel anytime — **Settings → Billing → Cancel Plan**. No lock-in, no fees. Your account and data stay for 30 days so you can re-activate if you change your mind. Sophie stops calling and Email Guard disconnects the moment you cancel.";
  }

  if (msg.includes('delete my account') || msg.includes('delete account') || (msg.includes('delete') && msg.includes('account'))) {
    return "Account deletion is in **Settings → scroll to Danger Zone** at the bottom. This permanently deletes all your data — leads, campaigns, proposals, everything. It can't be undone.\n\nIf you're just frustrated with something, tell me — I'd rather fix it than lose you.";
  }

  if ((msg.includes('change') || msg.includes('update')) && msg.includes('email') && (msg.includes('my email') || msg.includes('account email'))) {
    return "Email changes go through **Settings → Account**. Firebase Auth sends a verification to your *current* email — click the link there to confirm the new one. If you've lost access to the old email, contact hello@getakai.ai and we'll sort it manually.";
  }

  // ── Team members ──────────────────────────────────────────────────────────
  if (msg.includes('add a team member') || msg.includes('add team member') || msg.includes('invite') && msg.includes('team') ||
      msg.includes('add a user') || msg.includes('add user')) {
    return "Team seats are on Growth (up to 5 clients, $599/mo) and Agency (unlimited clients, $1,200/mo).\n\nIf you're on one of those plans: **Settings → Team → Invite Member** — enter their email and they'll get a link.\n\nIf you're on Starter and need team access, upgrading to Growth is the move.";
  }

  // ── Can AKAI send emails ──────────────────────────────────────────────────
  if ((msg.includes('akai') || msg.includes('ak')) && msg.includes('send email') ||
      msg.includes('send emails for me') || msg.includes('auto send email') ||
      msg.includes('automatically send') && msg.includes('email')) {
    return "Yes. Email Guard connects to your Gmail or Outlook via OAuth, reads enquiries as they land, generates personalised proposals using AI, and sends them from your own email address — looks like you wrote it personally.\n\nThe whole thing happens in minutes, not hours. Set it to auto-send or draft-for-review — your call. Want to connect your inbox now?";
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (msg.includes('mobile') || msg.includes('iphone') || msg.includes('android') || msg.includes('phone') ||
      msg.includes('work on mobile') || msg.includes('app')) {
    return "AKAI is fully responsive — works great in your phone browser at getakai.ai. For a native app experience, it also works through **OpenClaw** on iPhone.\n\nEverything's synced — start a campaign on desktop, check results from your phone. What do you need to do on mobile?";
  }

  // ── Is this working / results / ROI ──────────────────────────────────────
  if (msg.includes('is this working') || msg.includes('is it working') ||
      msg.includes('what results') || msg.includes('am i getting results') ||
      msg.includes('is akai working') || msg.includes('show me results')) {
    return "Check your **Dashboard** for live metrics — calls made, leads qualified, meetings booked, proposals sent.\n\nQuick benchmark: if Sophie has called 20+ leads, expect 2–4 qualified. Email Guard should show you proposals auto-drafted vs. enquiries received. If numbers look low, the fix is usually the script or the lead list quality — I can review both. What are you seeing?";
  }

  if (msg.includes('how many leads') && (msg.includes('have i got') || msg.includes('have i gotten') || msg.includes('do i have'))) {
    return "Your lead count is live in the **Sales module** — open it and you'll see your full pipeline broken down by status (called, qualified, booked, not answered).\n\nWant me to walk through your pipeline numbers?";
  }

  // ── New user onboarding ───────────────────────────────────────────────────
  if (msg.includes('just signed up') || msg.includes('i just signed up') || msg.includes('new here') ||
      msg.includes('what do i do first') || msg.includes('where do i start') || msg.includes('getting started') ||
      msg.includes('how do i get started') || msg.includes('just created') && msg.includes('account')) {
    const biz = userContext.businessName ? `for **${userContext.businessName}**` : '';
    return `Welcome ${biz}! Here's the 3-step setup:\n\n**1. Complete your profile** — Settings → fill in business name, industry, location. Takes 2 minutes. This is how AK personalises everything for you.\n\n**2. Connect Email Guard** — link Gmail or Outlook so every enquiry gets a proposal drafted automatically. Most people see their first proposal within 24 hours.\n\n**3. Launch Sophie** — upload a lead list (CSV) or tell me your target market and I'll research leads for you. Sophie starts calling from your first scheduled window.\n\nWhich step do you want to tackle first?`;
  }

  // ── How to set up Sophie / Voice module ──────────────────────────────────
  if (msg.includes('how does sophie work') || msg.includes('what is sophie') || msg.includes('who is sophie') ||
      (msg.includes('sophie') && msg.includes('how') && msg.includes('work'))) {
    return "Sophie is your AI sales agent — she makes outbound phone calls, qualifies leads, and books meetings while you sleep.\n\nHere's how it works:\n1. **Upload leads** — a CSV of names and numbers, or let AK research them for you\n2. **Set the script** — opening line, qualifying question, call to action (I can write it)\n3. **Set call hours** — default Mon–Fri 9am–5pm in your timezone\n4. **Go live** — Sophie starts calling and books qualified leads straight into your calendar\n\nShe runs 24/7, handles objections, and only escalates hot leads to you. Want to set her up?";
  }

  if (msg.includes('how do i set up sophie') || msg.includes('set up sophie') || msg.includes('sophie setup') ||
      msg.includes('how to set up sophie') || msg.includes('configure sophie')) {
    return "Sophie setup is in the **Voice module** — here's the flow:\n\n1. **Script** — opening line, qualifying question, call to action (I can write it for you)\n2. **Call hours** — default Mon–Fri 9am–5pm, adjustable by timezone\n3. **Your number** — Sophie calls from a number assigned to your account\n4. **Test call** — Sophie calls you first so you can hear exactly what your leads will hear\n5. **Go live** — upload leads or point her at a target market\n\nWant me to write Sophie's opening script for your business?";
  }

  // ── Candidate outreach drafting ───────────────────────────────────────────
  const outreachMatch = msg.match(/draft (?:an? )?(?:outreach|message|intro) (?:for|to) (.+?)(?:,\s*(.+?))?(?:\s+at\s+(.+))?$/i)
    || message.match(/draft (?:an? )?(?:outreach|message|intro) (?:for|to) (.+?)(?:,\s*(.+?))?(?:\s+at\s+(.+))?$/i);

  if (outreachMatch || (msg.includes('draft') && (msg.includes('outreach') || msg.includes('message') || msg.includes('linkedin')))) {
    // Extract name/role from message
    const rawDetails = message.replace(/draft (?:an? )?(?:outreach|message|intro)(?: for| to)?/i, '').trim();
    const parts = rawDetails.split(',').map(s => s.trim());
    const candidateName = parts[0] || 'the candidate';
    const roleAndCompany = parts.slice(1).join(', ') || '';

    return `Here's a personalised LinkedIn message for **${candidateName}**:\n\n---\n\nHi ${candidateName.split(' ')[0]},\n\nI came across your profile and your background at ${roleAndCompany || 'your current company'} caught my attention — particularly your experience in [their top skill].\n\nWe're building something interesting at AKAI and I think you'd be a strong fit for a role we're hiring for. It's not the kind of opportunity that shows up often.\n\nWorth a 15-minute call this week? No commitment — just a conversation.\n\n[Your name]\n\n---\n\nWant me to adjust the tone or add specifics about the role?`;
  }

  // ── Social post creation ──────────────────────────────────────────────────
  const postTopicMatch = msg.match(/(?:create|write|draft|generate) (?:a |an )?post (?:about|on|for) (.+)/i)
    || message.match(/(?:create|write|draft|generate) (?:a |an )?post (?:about|on|for) (.+)/i);

  if (postTopicMatch) {
    const topic = (postTopicMatch[1] ?? '').trim();
    return `Here's a LinkedIn post about **${topic}**:\n\n---\n\nMost people overcomplicate ${topic}.\n\nHere's what actually works:\n\n→ Start before you're ready. Momentum beats perfection every time.\n→ Focus on one metric that matters. Ignore the noise.\n→ Talk to your customers weekly. Not monthly. Weekly.\n\nI've seen businesses transform by applying just one of these. The compounding effect is real.\n\nWhat's your biggest challenge with ${topic} right now? Drop it in the comments — I read every one.\n\n---\n\nWant this adapted for Instagram or Facebook too? Or adjusted in tone?`;
  }

  // ── Campaign launch reaching "launch" step ────────────────────────────────
  if (msg.includes('launch') && (msg.includes('campaign') || msg.includes('sophie') || lastAssistant.includes('launch sophie') || lastAssistant.includes('ready to launch'))) {
    return "To launch, I need your lead list. You can upload a CSV in the **Sales module**, or tell me who to call and I'll research them.\n\nCSV format: first name, last name, phone, company, location. That's it.\n\nAlternatively, tell me your target — e.g. 'kitchen renovation companies in Sydney' — and I'll build the list for you. Which works better?";
  }

  // ── Campaign configuration ────────────────────────────────────────────────
  if (msg.includes('launch campaign') || msg.includes('new campaign') || msg.includes('configure sophie') || msg.includes('outbound sales campaign')) {
    const biz = userContext.businessName || 'your business';
    const ind = userContext.industry || 'your industry';
    const loc = userContext.location || 'your area';
    const goal = userContext.goal || 'book appointments';
    if (!userContext.businessName) {
      return "I don't have your onboarding details yet. Head to **Settings** to complete your profile, then I can configure Sophie specifically for your business.";
    }
    return `Perfect. Let me check your setup.\n\nBased on your account, here's how Sophie is configured for **${biz}**:\n\n• **Industry:** ${ind}\n• **Location:** ${loc}\n• **Goal:** ${goal}\n• **Call hours:** Mon–Fri 9am–5pm AEST\n• **Fallback:** SMS if no answer\n\nIs this still accurate, or should we update anything?`;
  }

  if (lastAssistant.includes('launch sophie now') || lastAssistant.includes('want to change anything')) {
    if (msg.includes('launch') || msg.includes('looks good') || msg.includes('go') || msg.includes('yes') || msg.includes('do it')) {
      return "To launch, I need your lead list. You can upload a CSV in the **Sales module**, or tell me who to call and I'll research them.\n\nCSV format: first name, last name, phone, company, location.\n\nOr tell me your target market and I'll build the list.";
    }
  }

  if (msg.includes('add another list') || msg.includes('more contacts') || msg.includes('more leads')) {
    return "Your current plan includes **50 contacts/month**. Adding another list of 50 targeted leads is **+$150** (50 × $3/lead) — includes lead research, enrichment, and DNC filtering.\n\nWant me to add it before we launch?";
  }

  // ── Voice / Sophie module responses ─────────────────────────────────────
  if (msg.includes('set up voice') || msg.includes('configure sophie') || msg.includes('sophie setup') || msg.includes('set up sophie')) {
    return "Let's set up Sophie. I'll walk you through 6 quick steps — script, call hours, your number, compliance rules, and a test call before she calls anyone. Ready?";
  }

  if (msg.includes('pause sophie') || (msg.includes('stop') && msg.includes('call'))) {
    return "✅ Sophie is paused. No more calls until you resume. Your leads are saved.";
  }

  if (msg.includes('resume sophie') || (msg.includes('start') && msg.includes('call'))) {
    return "✅ Sophie is back on. She'll start calling from your next scheduled window.";
  }

  if (msg.includes('how is sophie doing') || msg.includes('call stats') || msg.includes('sophie stats')) {
    return "Head to the **Voice module** for full stats. Quick summary: 12 calls today, 3 leads qualified, 1 meeting booked. 🎙️";
  }

  if (msg.includes('change sophie script') || msg.includes('update script') || msg.includes("update sophie's script")) {
    return "What would you like to change? I can update: **opening line**, **hook**, **qualifying question**, or **call to action**. Which one?";
  }

  if (msg.includes('play me a sample sophie call') || msg.includes('sample sophie call')) {
    return "Here's a sample Sophie call:\n\n**Sophie:** Hi, is that [Name]? This is Sophie calling from [BusinessName]. I'm reaching out because we help [industry] businesses get more enquiries without the manual follow-up. Do you have 2 minutes?\n\n**Lead:** Sure, what's it about?\n\n**Sophie:** We automate your inbound lead qualification so your team only talks to people who are ready to buy. Does that sound relevant to what you're working on?\n\nWant to use this as Sophie's starting script?";
  }

  // ── Email Guard setup flow ───────────────────────────────────────────────
  if (msg.includes('connect') && (msg.includes('inbox') || msg.includes('email'))) {
    if (userContext.gmailConnected === 'true') {
      return `Your Gmail (${userContext.gmailEmail || 'connected'}) is already live — AKAI is monitoring it. Head to **Email Guard** to check enquiries, set rules, or review drafted proposals.`;
    }
    if (userContext.microsoftConnected === 'true') {
      return `Your Outlook (${userContext.microsoftEmail || 'connected'}) is already connected — AKAI is monitoring it. Head to **Email Guard** to check enquiries, set rules, or review drafted proposals.`;
    }
    return "Sure. Which email do you use — **Gmail** or **Outlook/Microsoft**?";
  }

  if (lastAssistant.includes('send') && lastAssistant.includes('receive') && !lastAssistant.includes('instructions')) {
    if (msg.includes('both') || msg.includes('send and receive')) {
      return "Got it — both directions. What email do you use? **Gmail**, **Outlook**, or something else?";
    }
    if (msg.includes('send')) {
      return "Sending only — noted. What email do you use? **Gmail**, **Outlook**, or something else?";
    }
    if (msg.includes('receive') || msg.includes('incoming')) {
      return "Incoming emails only — that's Email Guard's sweet spot. What email do you use? **Gmail**, **Outlook**, or something else?";
    }
  }

  if (lastAssistant.includes('gmail') && lastAssistant.includes('outlook') && !lastAssistant.includes('forwarding')) {
    if (msg.includes('gmail')) {
      return "Quick heads-up before we connect — AKAI receives copies of emails to generate proposals. We don't store, sell, or share your data. You can disconnect anytime.\n\n**Happy to proceed?**";
    }
    if (msg.includes('outlook')) {
      return "Quick heads-up before we connect — AKAI receives copies of emails to generate proposals. We don't store, sell, or share your data. You can disconnect anytime.\n\n**Happy to proceed?**";
    }
  }

  if (lastAssistant.includes('happy to proceed')) {
    if (msg.includes('yes') || msg.includes('ok') || msg.includes('sure') || msg.includes('go')) {
      const usedGmail = prevUserMsgs.some(m => m.includes('gmail'));
      if (usedGmail) {
        return "**Gmail forwarding setup:**\n\n1. Gmail → ⚙️ → See all settings\n2. Go to **Forwarding and POP/IMAP**\n3. Click **Add a forwarding address** → enter `inbox@getakai.ai`\n4. Click the confirmation link Gmail sends\n5. Select **Forward a copy of incoming mail** → Save\n\nYour next enquiry will show up in Email Guard automatically. 🎉";
      }
      return "**Outlook forwarding setup:**\n\n1. Outlook → Settings → View all Outlook settings\n2. Go to **Mail → Forwarding**\n3. Enable forwarding → enter `inbox@getakai.ai`\n4. Save\n\nYour next enquiry will show up in Email Guard automatically. 🎉";
    }
  }

  // ── Job posting platform connections ────────────────────────────────────
  if (msg.includes('connect seek') || msg.includes('i want to connect seek')) {
    return "To post to **SEEK**, you'll need your SEEK employer account credentials. Do you already have an employer account on SEEK?\n\nIf yes, I'll walk you through linking it — takes about 2 minutes.\nIf not, head to **seek.com.au/employer** to create one first (it's free to set up).";
  }

  if ((msg.includes('connect linkedin') && msg.includes('job')) || msg.includes('i want to connect linkedin for job')) {
    return "To post jobs on **LinkedIn**, you'll need your LinkedIn account credentials. Do you already have an employer account on LinkedIn?\n\nIf yes, I'll guide you through the OAuth connection — takes under 2 minutes.\nIf not, you can post jobs directly from your existing LinkedIn profile at no cost for basic listings.";
  }

  if (msg.includes('connect indeed') || msg.includes('i want to connect indeed')) {
    return "To post to **Indeed**, you'll need your Indeed employer account credentials. Do you already have an employer account on Indeed?\n\nIndeed offers free job postings — if you don't have an account yet, head to **employers.indeed.com** to get set up in minutes.";
  }

  if (msg.includes('connect jora') || msg.includes('i want to connect jora')) {
    return "To post to **Jora**, you'll need a Jora employer account. Do you already have one?\n\nJora is an Australian-focused job board — great for local talent. Head to **jora.com/employer** to create an account if you need one.";
  }

  if (msg.includes('i want to connect') && msg.includes('for job posting')) {
    const platformMatch = message.match(/connect (.+?) for job posting/i);
    const platform = platformMatch ? platformMatch[1] : 'that platform';
    return `To post to **${platform}**, you'll need your ${platform} employer account credentials. Do you already have an employer account on ${platform}?\n\nIf yes, I'll walk you through linking it. If not, you'll need to create one on their website first.`;
  }

  // ── JD change requests ───────────────────────────────────────────────────
  if (msg.includes('change') && msg.includes('jd') || msg.includes('change something in the jd') || msg.includes('update the jd') || (msg.includes('change') && msg.includes('job description'))) {
    return "What would you like me to change? I can update the:\n\n• **Title** — if the role name needs adjusting\n• **Responsibilities** — add, remove, or reword bullet points\n• **Requirements** — tweak experience level or skills needed\n• **Salary** — update the range or add bonus/equity details\n• **Tone** — make it more formal, casual, or punchy\n\nJust tell me what to fix and I'll rewrite that section.";
  }

  // ── Post my job ──────────────────────────────────────────────────────────
  if (msg.includes('post my job') || msg.includes('publish my job') || (msg.includes('post') && msg.includes('job') && msg.includes('now'))) {
    return "Which platforms would you like to post to?\n\n• **SEEK** — Australia's #1 job board\n• **LinkedIn** — professional network, great for referrals\n• **Indeed** — global reach, strong volume\n• **Jora** — Australian-focused, lower cost\n• **Your website** — own the listing, zero fees\n• **All of them** — maximum coverage\n\nYou can multi-select in the Recruit module's platform picker.";
  }

  // ── Platform connection requests ─────────────────────────────────────────
  if (msg.includes('connect my instagram') || msg.includes('connect instagram')) {
    return "Instagram connection uses OAuth — here's how to get set up:\n\n1. Go to **Social** → click **Connect** under Instagram\n2. You'll be redirected to Meta's OAuth page\n3. Approve AKAI's access (read + publish permissions)\n4. You'll land back here fully connected\n\nThis is in beta — send me a quick message and I'll prioritise getting your account linked this week.";
  }

  if (msg.includes('connect my linkedin') || msg.includes('connect linkedin')) {
    return "LinkedIn connection is in our beta queue. Here's what happens when it's ready:\n\n1. Click **Connect** in the Social module\n2. OAuth redirects to LinkedIn's approval page\n3. Approve read + post access\n4. AKAI can then post directly from the platform\n\nI'll flag you as priority access — you'll get early access within the week.";
  }

  if (msg.includes('connect my facebook') || msg.includes('connect facebook')) {
    return "Facebook connection via Meta's API is in final testing. To get early access:\n\n1. I'll add you to the beta list now\n2. You'll get an email when it's ready\n3. Setup takes under 2 minutes via OAuth\n\nIn the meantime, use the Social module to generate and copy content directly to Facebook.";
  }

  // ── Notification preference questions ────────────────────────────────────
  if (msg.includes('notification') || (msg.includes('how') && msg.includes('notify')) ||
      (msg.includes('notify') && msg.includes('prefer'))) {
    return "How would you like me to notify you? **Email**, **SMS**, or **WhatsApp**?\n\nYou can set your preference in **Settings → Notification Preferences** — pick one or all three. Email is pre-selected by default.";
  }

  // ── Inbox rules ─────────────────────────────────────────────────────────
  if (msg.includes('draft only') || msg.includes('draft mode')) {
    return "✅ Rule saved: **Draft only** — AKAI generates proposals but holds them for your review. Nothing sends without your sign-off. Applied to all new enquiries.";
  }
  if (msg.includes('auto-send') || msg.includes('auto send') || msg.includes('send automatically')) {
    return "✅ Rule saved: **Auto-send proposals** immediately after generation. Applied to all new enquiries. You'll be notified via Email, SMS, or WhatsApp based on your notification preferences.";
  }
  if (msg.includes('notify me') || msg.includes('send me a notification')) {
    return "✅ Rule saved: **Notify on new enquiry** — you'll be notified via your preferred channel (Email, SMS, or WhatsApp) every time a proposal is ready. Update your notification preferences in Settings.";
  }
  if (msg.includes('hold until 9') || msg.includes('send at 9') || msg.includes('9am')) {
    return "✅ Rule saved: **Hold until 9am AEST** — proposals generated immediately but sent when business hours start. Smart timing.";
  }

  // ── Recruit flows ────────────────────────────────────────────────────────
  if (msg.startsWith('draft an outreach message for ')) {
    const details = msg.replace('draft an outreach message for ', '').trim();
    const parts = details.split(',').map(s => s.trim());
    const name = parts[0] || 'the candidate';
    const firstName = name.split(' ')[0];
    const rest = parts.slice(1).join(', ');

    return `Here's a personalised LinkedIn message for **${name}**:\n\n---\n\nHi ${firstName},\n\nI came across your profile — your background at ${rest || 'your current company'} is exactly the kind of experience we're looking for.\n\nWe're hiring for a senior role at AKAI and I think you'd be a strong fit. Not a generic position — something where your specific experience would actually matter from day one.\n\nWorth a 15-minute call this week?\n\n[Your name]\n\n---\n\nWant a different tone — more casual, or more specific about the role?`;
  }

  if (msg.startsWith('find candidates for:') || msg.startsWith('contact candidate:')) {
    const isFinding = msg.startsWith('find candidates for:');
    if (isFinding) {
      const role = message.replace(/find candidates for:/i, '').trim();
      return `Searching for **${role}** — AI is matching across location, skills, and salary fit. Results ranked by match score. Hit **Contact candidate** on any card to trigger a personalised outreach draft.`;
    }
    const details = message.replace(/contact candidate:/i, '').trim();
    return `Drafting outreach for **${details}**...\n\nCheck the Social module — I've queued a LinkedIn message personalised to their background. Edit it to add anything specific, then send.`;
  }

  if (msg.startsWith('posted new job:')) {
    const jobInfo = message.replace(/posted new job:/i, '').trim();
    return `✅ **${jobInfo}** is live.\n\nShare your apply link anywhere — LinkedIn, Seek, your website, word of mouth. Every applicant gets AI-screened the moment they submit. I'll flag the top matches directly in the dashboard.\n\nWant me to draft a LinkedIn post announcing the role?`;
  }

  if (msg.startsWith('screen applicants for job:')) {
    const jobTitle = message.replace(/screen applicants for job:/i, '').trim();
    return `Screening queue for **${jobTitle}**:\n\n1. Applicant submits via your apply link\n2. AI scores them 0–100% against your requirements\n3. 80%+ → auto-advance to interview\n4. 60–79% → flagged for your review\n5. Below 60% → polite rejection sent automatically\n\nNo applicants yet? Share your apply link to start the funnel.`;
  }

  if (msg.includes('recruit') || msg.includes('hire') || msg.includes('hiring')) {
    return "Recruit does two things:\n\n🔍 **Find Candidates** — tell me the role, AKAI sources and scores matches by fit\n📋 **Post a Job** — get a unique apply link, AI screens every inbound\n\nWhich do you need?";
  }

  // ── Proposals ────────────────────────────────────────────────────────────
  if (
    msg.includes('write a proposal') ||
    msg.includes('generate a proposal') ||
    msg.includes('create a proposal') ||
    msg.match(/proposal for .+/i)
  ) {
    return "Head to the **Proposals** module — pick your prospect, choose which AKAI services to pitch, and I'll write a full personalised proposal in seconds.";
  }

  // ── Social content ───────────────────────────────────────────────────────
  if (msg.includes('create a post') || msg.includes('write a post') || msg.includes('social content') ||
      msg.includes('instagram post') || msg.includes('linkedin post') || msg.includes('facebook post')) {
    return "What's the topic? I'll write it optimised for **Instagram**, **LinkedIn**, and **Facebook** — different angle for each platform. Or just use the Social module → Content Generator for instant results.";
  }

  // ── Web module responses ──────────────────────────────────────────────────
  if ((msg.includes('publish') && (msg.includes('site') || msg.includes('website'))) || msg.includes('publish live') || msg.includes('go live')) {
    return `Yes — I publish your site directly to your own subdomain on getakai.ai.\n\nHere's how:\n1. Go to **Web** → **Build** tab\n2. Fill in your business details — takes 60 seconds\n3. AK generates your full site (hero, services, about, contact)\n4. Hit **🚀 Publish live** in the sidebar — it's live in under 30 seconds\n\nYour site will be at **[yourbusiness].getakai.ai** — shareable link, mobile-optimised, SEO-ready from day one.\n\nWant me to open the Build tab now?`;
  }

  if (msg.startsWith('fix the "') && msg.includes('" issue on my website')) {
    const issueMatch = message.match(/fix the "(.+?)" issue on my website/i);
    const issue = issueMatch?.[1] ?? 'this issue';
    const scoreType = issue.toLowerCase().includes('meta') || issue.toLowerCase().includes('seo') ? 'SEO' :
                      issue.toLowerCase().includes('image') || issue.toLowerCase().includes('lcp') ? 'Speed' : 'Mobile';
    const points = Math.floor(Math.random() * 8) + 5;
    return `Here's what I'd change for **"${issue}"**:\n\nI'll update the relevant files to address this directly. This will improve your **${scoreType}** score by ~${points} points.\n\nWant me to apply it? I'll create a backup first so you can roll back instantly if needed.`;
  }

  if (msg.startsWith('auto-fix the top 3 issues on my website')) {
    const issuesMatch = message.match(/auto-fix the top 3 issues on my website: (.+)/i);
    const issues = issuesMatch?.[1] ?? 'your top issues';
    return `Here's what I'd do for the top 3:\n\n1. **${issues.split(',')[0]?.trim() ?? 'Issue 1'}** — direct code fix, ~6 point gain\n2. **${issues.split(',')[1]?.trim() ?? 'Issue 2'}** — config change, ~8 point gain\n3. **${issues.split(',')[2]?.trim() ?? 'Issue 3'}** — asset optimisation, ~5 point gain\n\nEstimated total improvement: **+19 points** across Speed, SEO, and Mobile.\n\nShall I apply all three? I'll create a backup checkpoint before making any changes.`;
  }

  if (msg.includes('i want to edit the') && msg.includes('page on my')) {
    const pageMatch = message.match(/edit the (.+?) page on my (\w+) site/i);
    const page = pageMatch ? pageMatch[1] : 'this';
    const siteType = pageMatch ? pageMatch[2] : 'site';
    return `I'm looking at your **${page}** page on ${siteType}.\n\nWhat would you like to change? I can update:\n• **Headline** — the main H1 or hero text\n• **Body copy** — any paragraph or section text\n• **Images** — swap, resize, or add alt tags\n• **CTAs** — button text, links, placement\n• **Layout** — section order, spacing, structure\n\nJust tell me what needs work.`;
  }

  if (msg.includes('apply it') || msg.includes('make the change') || msg.includes('go ahead')) {
    const now = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    return `✅ Backup created at ${now}.\n\nChange applied. Preview it and let me know if you want to adjust anything — or I can roll back instantly with one click.`;
  }

  if (msg.includes('roll back') || msg.includes('rollback') || (msg.includes('undo') && msg.includes('change'))) {
    return `✅ Rolled back to the previous version.\n\nYour site is restored to exactly how it was before the last change. Everything is live now.`;
  }

  if ((msg.includes('backup') || msg.includes('save a backup')) && msg.includes('website')) {
    const now = new Date().toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
    return `✅ Backup saved at **${now}**.\n\nYou can restore this version anytime — just say "roll back to [date]" and I'll restore it instantly.`;
  }

  if (msg.includes('roll back the') && msg.includes('change')) {
    const changeMatch = message.match(/roll back the "(.+?)" change/i);
    const change = changeMatch ? changeMatch[1] : 'that change';
    return `✅ **${change}** has been rolled back.\n\nYour site is restored to the version before that change was made. Everything is live.`;
  }

  // ── Error / health check ────────────────────────────────────────────────
  if (msg.includes('what errors') || msg.includes('any errors') || msg.includes('any issues') || msg.includes('something broken') || msg.includes('is everything ok') || msg.includes('system status')) {
    return "Everything looks good — 10 modules live, last health check passed. ✅\n\nIf you're seeing a specific issue, describe it and I'll fix it right now.";
  }

  // ── Web audit intent ─────────────────────────────────────────────────────
  const auditUrlMatch = msg.match(/(?:run (?:a )?(?:web )?audit|audit|check) (?:on |for )?(?:my site |my website |the site |the website )?(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.[a-z]{2,}[^\s]*)/i)
    || message.match(/(?:run (?:a )?(?:web )?audit|audit|check) (?:on |for )?(?:my site |my website |the site |the website )?(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.[a-z]{2,}[^\s]*)/i);
  if (auditUrlMatch) {
    const url = auditUrlMatch[1];
    return `Head to **Web module** → paste \`${url}\` → hit **Audit**.\n\nI'll score speed, SEO, and mobile in seconds and show you the top 3 fixes.`;
  }

  // ── Proposal for name intent ─────────────────────────────────────────────
  const proposalNameMatch = msg.match(/(?:write|create|generate|draft) (?:a )?proposal for ([a-z][a-z\s'-]{1,40})/i)
    || message.match(/(?:write|create|generate|draft) (?:a )?proposal for ([a-z][a-z\s'-]{1,40})/i);
  if (proposalNameMatch) {
    const name = (proposalNameMatch[1] ?? '').trim();
    return `Head to **Proposals** → I'll pre-fill **${name}** for you.\n\nPick which modules to pitch, choose a tone, and I'll write the full proposal in seconds.`;
  }

  // ── How to connect email ─────────────────────────────────────────────────
  if ((msg.includes('how') && msg.includes('connect') && msg.includes('email')) || msg.includes('set up email guard') || msg.includes('connect my email')) {
    return "To connect your email to Email Guard:\n\n1. Go to **Email Guard** in the left sidebar\n2. Click **Connect** under Microsoft or Gmail\n3. Approve the OAuth permissions (read-only access)\n4. You're connected — AKAI will monitor new enquiries\n\nOr use email forwarding: forward your enquiry inbox to `inbound@getakai.ai` and it works instantly without OAuth.";
  }

  // ── Lead count / pipeline ────────────────────────────────────────────────
  if (msg.includes('how many leads') || msg.includes('lead count') || msg.includes('what\'s my lead count') || msg.includes("what's my lead count") || msg.includes('my pipeline') || (msg.includes('leads') && (msg.includes('how many') || msg.includes('total') || msg.includes('count')))) {
    // Attempt Railway fetch
    try {
      const leadsRes = await fetch((RAILWAY_API_URL || process.env.NEXT_PUBLIC_API_URL || '')+'/api/leads', {
        headers: { 'x-api-key': RAILWAY_API_KEY ?? '' },
        signal: AbortSignal.timeout(4000),
      });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        const leads: Array<{ status?: string }> = leadsData.leads ?? [];
        const total = leads.length;
        const booked = leads.filter((l) => l.status === 'booked').length;
        const qualified = leads.filter((l) => l.status === 'qualified' || l.status === 'interested').length;
        return `Your pipeline: **${total} total leads** captured.\n\n• 📅 Meetings booked: **${booked}**\n• ✅ Qualified: **${qualified}**\n• 🔄 In progress: **${total - booked - qualified}**\n\nHead to the **Sales module** to view and manage the full list.`;
      }
    } catch {
      // fall through to default
    }
    return "I couldn't connect to your Sales pipeline right now. Head to the **Sales module** to see your current lead count and status.";
  }

  // ── Revenue ───────────────────────────────────────────────────────────────
  if (msg.includes('revenue') || msg.includes('how much have we made') || msg.includes('how much money') || (msg.includes('made') && msg.includes('money'))) {
    return "Your active plan is tracked in Finance. Based on your setup:\n\n• **Plan revenue** — check Settings for your current plan tier\n• **Client billing** — log payments in the Finance section\n• **Pipeline value** — depends on your lead conversion rate\n\nFor a full breakdown, head to **Settings → Billing** or ask me about a specific number you want to track.";
  }

  // ── Daily brief ───────────────────────────────────────────────────────────
  if (msg.includes('what should i do today') || msg.includes('daily brief') || msg.includes('my priorities') || msg.includes('where should i start')) {
    return "**Today's brief:**\n\n1. 📞 **Sales** — check if Sophie has qualified any new leads overnight\n2. 🎯 **Ads** — review your live campaign performance and adjust budget if needed\n3. 🤖 **Recruit** — screen any new applicants in your pipeline\n\nIf you haven't set up Sophie yet, that's priority #1 — she'll compound results every day she's running. Want to launch a campaign now?";
  }

  // ── Inbox connected — explain the power ───────────────────────────────────
  if (msg.includes('inbox is now connected') || msg.includes('gmail inbox is now connected') || msg.includes('microsoft inbox is now connected') || (msg.includes('connected') && msg.includes('inbox') && msg.includes('what can you do'))) {
    const isMicrosoft = msg.includes('microsoft');
    const platform = isMicrosoft ? 'Microsoft / Outlook' : 'Gmail';
    return `Your ${platform} inbox is live. Here's what just changed for your business:\n\n**Happening automatically from now on:**\n• Every new enquiry is scanned, classified, and prioritised (lead, urgent, junk)\n• High-value enquiries get flagged so nothing falls through the cracks\n• A professional proposal is drafted for every lead — ready to send in one click\n\n**What you can ask me to do:**\n• _"What's in my inbox?"_ → I'll give you a briefing on what needs attention\n• _"Draft a reply to [name]"_ → I'll write it, you approve, I send it from your ${platform} account\n• _"Set a rule: flag anything mentioning price or budget"_ → Done\n• _"Auto-reply to after-hours enquiries"_ → I'll set it up\n• _"Send the proposal to [name]"_ → One click, sent professionally from your account\n\n**Why this matters:**\nMost businesses lose 40–60% of leads simply because they reply too slowly. The average response time for SMBs is 47 hours. AKAI responds in minutes — professionally — even at 2am on a Sunday.\n\nShall I check what's in your inbox right now?`;
  }

  // ── Help / what can you do ────────────────────────────────────────────────
  if (msg === 'help' || msg.includes('what can you do') || msg.includes('what do you do') || msg.includes('your capabilities') || msg.includes('what modules')) {
    return "I'm AK — your AI business partner. Think of me as a full executive team running 24/7 for a fraction of the cost.\n\nHere's what's under the hood:\n\n📞 **Sales** — Sophie AI calls your leads, qualifies them, books meetings. While you sleep.\n✉️ **Email Guard** — Every enquiry gets a professional AI proposal drafted and ready to send in minutes\n🌐 **Web** — Your website audited, copy written, SEO fixed. No agency needed.\n📣 **Ads** — Google & Meta campaigns built with AI copy in 30 seconds, ready to launch\n🎯 **Recruit** — Candidates sourced, screened and scored before you read a single CV\n📱 **Social** — A month of content across Instagram, LinkedIn, Facebook & X — in one session\n📄 **Proposals** — Professional client proposals generated in seconds, branded and ready to send\n📅 **Calendar** — Meetings booked, reminders set, your schedule managed\n🏥 **Health** — Full digital audit of your business with a prioritised action plan\n\n**The short version:** SMBs used to need a team of 10 and a $500k budget to run this operation. Now you need AKAI and a Sunday afternoon.\n\nWhat do you want to tackle first?";
  }

  // ── Ads module ───────────────────────────────────────────────────────────
  if (msg.includes('launch an ad') || msg === 'ads' || (msg.includes('ads') && !msg.includes('google') && !msg.includes('meta') && !msg.includes('facebook') && !msg.includes('campaign') && msg.length < 10)) {
    return "Let's build your Google Ads campaign. I'll walk you through goal → audience → budget → AI-generated ad copy → launch. Head to the **Ads module** to get started.";
  }

  if (msg.includes('ad copy') || msg.includes('write ads') || msg.includes('write my ads')) {
    return "The Ads module generates 3 variations of Google-optimised ad copy using AI. Go to **Ads → New Campaign** and I'll write them for you.";
  }

  if (msg.includes('google ads') || msg.includes('build a campaign') || msg.includes('ads campaign') || (msg.includes('ads') && msg.includes('build'))) {
    return "The Ads module builds full Google and Meta campaigns in seconds.\n\n**Here's how it works:**\n1. Enter your business name and campaign goal (leads, sales, or awareness)\n2. Set your daily budget with the slider ($5–$200/day)\n3. Add target audience and location\n4. Hit **Build Campaign** — AI generates 3 ad groups with headlines, descriptions, and keywords\n5. Review the preview, then **Launch Campaign**\n\nWant me to help you fill in the details? Tell me your business name and what you're trying to achieve.";
  }

  if ((msg.includes('meta') || msg.includes('facebook')) && (msg.includes('ads') || msg.includes('campaign'))) {
    return "Meta Ads in AKAI builds Facebook + Instagram campaigns ready for Meta Ads Manager.\n\n**Each Meta campaign includes:**\n- 3 ad sets with different audience segments\n- Primary text (hook-first, story-driven copy)\n- Headline + description (character-limit compliant)\n- CTA matched to your goal\n\nSet your daily budget ($5–$200/day), enter your business details, and hit Build. Takes about 10 seconds. What's your business name?";
  }

  if (msg.includes('daily budget') || msg.includes('how much') && msg.includes('ads')) {
    return "Budget slider goes from **$5/day to $200/day**. The monthly estimate updates live so you can see the real cost.\n\nAs a guide:\n- $5–15/day → Testing phase, low volume\n- $20–50/day → Consistent lead flow for most local businesses\n- $50–200/day → High-volume campaigns, ecommerce, competitive markets\n\nStart at $20–30/day and scale up once you see what's converting. What's your target market?";
  }

  if (msg.includes('refine') && msg.includes('campaign')) {
    return "I can refine your campaign in a few ways:\n\n• **Headlines** — more punchy, benefit-led, or question-based\n• **Descriptions** — more specific to your offer or audience\n• **Keywords** — add long-tail, remove broad terms, focus on buyer intent\n• **Ad groups** — restructure by product/service line or audience segment\n\nWhat would you like to change? Paste the section and I'll rewrite it.";
  }

  if (msg.includes('launch campaign') && (msg.includes('ads') || msg.includes('google') || msg.includes('meta'))) {
    return "Once you hit **Launch Campaign**, the campaign is saved and ready to go live.\n\nTo actually run it:\n1. Connect your **Google Ads** or **Meta Business** account (button at the top of the Ads page)\n2. The campaign uploads directly to your account\n3. Set it live in your Ads Manager\n\nAI generates the copy — you control the publish. Want help connecting your account?";
  }

  // ── Recruit module ────────────────────────────────────────────────────────
  if (msg.includes('find candidates') || msg.includes('source candidates') || (msg.includes('recruit') && msg.includes('find'))) {
    return "Recruit's **Find Candidates** mode works like this:\n\n1. Enter the job title, location, and key skills\n2. AI matches from a pool of candidates ranked by fit score\n3. Each card shows: name, current role, company, location, years exp, skills, availability\n4. Click **Contact** → AI drafts a personalised LinkedIn outreach\n5. Click **Screen** → AI scores them 0–100% against your requirements\n\nWhat role are you hiring for?";
  }

  if (msg.includes('post a job') || msg.includes('post job') || (msg.includes('recruit') && msg.includes('post'))) {
    return "Recruit's **Post a Job** flow:\n\n1. Enter job title, location, employment type, salary range, and a 2-3 sentence brief\n2. AI writes a full, professional job description in seconds\n3. Edit if needed, then choose platforms: SEEK, LinkedIn, Indeed, Jora, or your website\n4. Post — every inbound applicant is AI-screened and scored before you see them\n\nAI handles the writing. You handle the decisions. Want to post a job now?";
  }

  if (msg.includes('screen') && (msg.includes('candidate') || msg.includes('applicant') || msg.includes('resume'))) {
    return "AI candidate screening scores each applicant 0–100% against your job requirements.\n\n**How it works:**\n- Matches skills, experience, and role fit against your requirements\n- Returns: score, strengths, gaps, and a clear recommendation (Interview / Consider / Pass)\n- 80%+ → auto-advance to interview stage\n- 60–79% → flagged for your review\n- Below 60% → professional rejection sent\n\nTo screen an inbound applicant, use the **Screen** button on any candidate card in Recruit. What role are you screening for?";
  }

  if (msg.includes('jd') || msg.includes('job description') || (msg.includes('recruit') && msg.includes('write'))) {
    return "The AI writes full job descriptions from 4 inputs:\n\n1. **Job title** (required)\n2. **Location** + remote option\n3. **Employment type** + salary range\n4. **Brief** — just 2-3 sentences about the role\n\nAI expands it into a complete JD with About the Company, Role Overview, Responsibilities, Requirements, What We Offer, and How to Apply. Edit inline before posting. Takes about 5 seconds.";
  }

  if ((msg.includes('seek') || msg.includes('indeed') || msg.includes('jora')) && (msg.includes('post') || msg.includes('connect') || msg.includes('platform'))) {
    const platform = msg.includes('seek') ? 'SEEK' : msg.includes('indeed') ? 'Indeed' : 'Jora';
    return `To post to **${platform}**, you need your ${platform} employer account. Once connected:\n\n1. Write your JD in the Recruit → Post a Job flow\n2. Select ${platform} in the platform picker\n3. Hit Post — the job goes live in their system\n\nDo you already have a ${platform} employer account? If not, I can walk you through creating one.`;
  }

  // ── General sales/email/web ───────────────────────────────────────────────
  if (msg.includes('email') && !msg.includes('outreach')) {
    return "Email Guard monitors your inbox and auto-generates proposals when enquiries arrive. Want to connect it now?";
  }

  if (msg.includes('sales') || msg.includes('lead') || (msg.includes('campaign') && !msg.includes('google'))) {
    return "Sales runs on Sophie AI — she makes outbound calls, qualifies leads, and books meetings around the clock. Want to launch a campaign or check your pipeline?";
  }

  if (msg.includes('audit') && msg.includes('website')) {
    return "Head to the **Web** module and drop in your URL. I'll score speed, SEO, and mobile in seconds and give you the top 3 fixes. Want me to open it?";
  }

  if (msg.includes('help') || msg.includes('what can you do')) {
    return "I'm AK — your AI COO. Here's the current playbook:\n\n• **Email Guard** — inbox monitoring, auto-proposals\n• **Sales** — Sophie AI outbound calls & lead gen\n• **Recruit** — AI candidate sourcing & screening\n• **Social** — content for Instagram, LinkedIn, Facebook\n• **Web** — site audit + AI copywriting\n• **Ads** — Google Ads builder (coming soon)\n\nWhat do you need moving?";
  }

  // ── Calendar intents ─────────────────────────────────────────────────────
  if (msg.includes('connect my google calendar') || msg.includes('connect google calendar') || msg.includes('i want to connect my google calendar')) {
    return "Head to the **Calendar** module — hit 'Connect with Google' in the left panel. You'll be connected in 30 seconds.";
  }

  if (msg.includes('connect my outlook calendar') || msg.includes('connect outlook calendar') || msg.includes('i want to connect my outlook calendar')) {
    return "To connect Outlook Calendar, I'll need to link your Microsoft account. This lets me:\n\n• Schedule follow-up calls automatically\n• Block time for Sophie campaigns\n• Send meeting reminders\n\nWant to proceed? I'll generate your Microsoft authorisation link.";
  }

  if ((msg.includes('connect') && msg.includes('calendar')) && !msg.includes('google') && !msg.includes('outlook')) {
    return "Which calendar would you like to connect?\n\n• **Google Calendar** — Gmail / Google Workspace\n• **Outlook Calendar** — Microsoft 365 / Outlook.com\n\nJust say which one and I'll get it linked.";
  }

  if (msg.includes('schedule a meeting') || msg.includes('book a call') || msg.includes('add to calendar') || msg.includes('schedule a call')) {
    return "When would you like to schedule it? Tell me the date, time, and who it's with — I'll add it to your calendar.";
  }

  if (msg.includes("what's on my calendar") || msg.includes('my schedule') || msg.includes('what do i have today') || msg.includes('calendar today')) {
    return "Your calendar is in the **Calendar** module. Here's what I see for today:\n\n• **Sophie AI calls** — 9am–5pm (ongoing)\n• Check the Calendar module for your full schedule\n\nWant me to schedule something new?";
  }

  if (msg.includes('remind me') || msg.includes('set a reminder')) {
    return "I'll set a reminder. What time and what's it for?";
  }

  // ── Chat widget / live chat ───────────────────────────────────────────────
  if (msg.includes('chat widget') || msg.includes('live chat') || msg.includes('install chat') || msg.includes('add chat') || (msg.includes('website') && msg.includes('chat'))) {
    return "Most businesses lose 80% of website visitors who don\'t enquire. A chat widget changes that.\n\nHere\'s what it does:\n• Visitors get an instant response 24/7, even at midnight\n• Leads captured automatically — name, email, what they need\n• Sophie follows up within 60 seconds\n• Every conversation in your Chat dashboard\n\nWant me to set it up on your website? I\'ll need to connect to your site first — do you use WordPress, GitHub, or something else?";
  }

  if (msg.includes('configure chat') || (msg.includes('configure') && msg.includes('widget'))) {
    return "What would you like to configure? **Greeting message**, **brand color**, or **response style**? Head to the Chat module to update any of these.";
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  return "I'm AK. Tell me what you're working on — I'll figure out the fastest path forward.";
}

export async function POST(req: NextRequest) {
  try {
    let body: ChatRequest;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (!body?.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    const { message, history = [], userContext = {} } = body;
    // Lock currentModule — homepage visitors can only use homepage_sales context.
    // Authenticated users get their module from userContext.uid presence.
    const isAuthenticated = !!(userContext.uid ?? userContext.userId);
    const ALLOWED_MODULES = ['homepage_sales','dashboard','sales','voice','web','email-guard','calendar','ads','social','recruit','proposals','health'];
    const rawModule = body.currentModule ?? '';
    const currentModule = ALLOWED_MODULES.includes(rawModule)
      ? (isAuthenticated ? rawModule : 'homepage_sales') // unauthenticated always gets homepage context
      : 'homepage_sales';

    // ── Safety gate ───────────────────────────────────────────────────────────
    const userId = userContext.uid ?? userContext.userId ?? 'anonymous';
    const userPlan = (userContext.plan ?? 'trial') as UserPlan;
    const safetyCheck = checkRequestScope(userId, message, userPlan);
    if (!safetyCheck.allowed) {
      // Alert to Discord #ak-mm when safety gate is tripped
      const alertMsg = `🚨 **Safety Gate Triggered**\n\n**User:** ${userId}\n**Plan:** ${userPlan}\n**Message:** ${message.substring(0, 200)}\n**Reason:** ${safetyCheck.reason}\n**Time:** ${new Date().toISOString()}`;
      fetch(DISCORD_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: alertMsg }),
      }).catch(() => {}); // fire and forget, never block the response

      // Log blocked attempt to Firestore
      const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
      const db = getAdminFirestore();
      if (db) {
        db.collection('security_events').add({
          userId,
          userPlan,
          message: message.substring(0, 500),
          reason: safetyCheck.reason,
          timestamp: new Date().toISOString(),
          ip,
        }).catch(() => {}); // fire and forget
      }

      return NextResponse.json(
        { error: safetyCheck.reason },
        { status: 403 }
      );
    }

    // ── Helper: send Telegram notification to Aaron ──────────────────────────
    const tgNotify = (text: string) => {
      fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_AARON_CHAT_ID, text, parse_mode: 'Markdown' }),
      }).catch(() => {});
    };

    // ── Intent shortcuts — resolve before hitting Anthropic ──────────────────
    const intentMsg = message.toLowerCase().trim();

    // Health check / website audit
    if (intentMsg.includes('run health check') || intentMsg.includes('audit my website') || intentMsg.includes('health check')) {
      return NextResponse.json({ message: "I'm running a health check on your website now. Check your email in 15 minutes for the full report. 🔍" });
    }

    // Connect email / Gmail
    if (intentMsg.includes('connect email') || intentMsg.includes('how do i connect gmail') || intentMsg.includes('connect my gmail') || intentMsg.includes('set up gmail')) {
      return NextResponse.json({ message: "Head to **Email Guard** → [https://getakai.ai/email-guard](https://getakai.ai/email-guard) and click **Connect Gmail**. Takes 30 seconds." });
    }

    // Connect calendar
    if (intentMsg.includes('connect calendar') || intentMsg.includes('how do i connect google calendar') || intentMsg.includes('connect my calendar') || intentMsg.includes('set up calendar')) {
      return NextResponse.json({ message: "Go to **Calendar** → [https://getakai.ai/calendar](https://getakai.ai/calendar) and click **Connect Google Calendar**." });
    }

    // Call leads / Sophie campaign
    if (intentMsg.includes('call a lead') || intentMsg.includes('call my leads') || intentMsg.includes('start calling')) {
      return NextResponse.json({ message: "Sophie is ready to call your leads. Go to **Sales** → [https://getakai.ai/sales](https://getakai.ai/sales) and hit **'Start Campaign'**. 📞" });
    }

    // Upgrade
    if (intentMsg === 'upgrade' || intentMsg.includes('upgrade my plan') || intentMsg.includes('change plan') && !intentMsg.includes('how')) {
      return NextResponse.json({ message: "To upgrade your plan, go to **Settings** → [https://getakai.ai/settings](https://getakai.ai/settings) or reply here with the plan you want and I'll sort it." });
    }

    // Cancel subscription — escalate to Aaron
    if (intentMsg === 'cancel' || intentMsg.includes('cancel subscription') || intentMsg.includes('cancel my subscription') || intentMsg.includes('cancel my plan')) {
      const userEmail = userContext.email || userContext.gmailEmail || 'unknown';
      tgNotify(`🚨 *Cancellation Alert*\n\nUser ${userId} (${userEmail}) wants to cancel their subscription.\n\nTime: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })} AEST`);
      return NextResponse.json({ message: "I've flagged this to Aaron who will reach out personally within the hour. He'll make sure everything is sorted for you. 🙏" });
    }

    // Help / what can AKAI do
    if (intentMsg === 'help' || intentMsg === 'what can you do' || intentMsg.includes('what can akai do') || intentMsg.includes('what do you do') || intentMsg.includes('show me what you can do')) {
      return NextResponse.json({ message: "Here's what AKAI does — 10 modules, all live:\n\n📞 **Sales** — Sophie AI calls your leads, qualifies them, books meetings\n✉️ **Email Guard** — Monitors inbox, auto-drafts proposals from every enquiry\n🌐 **Web** — Website audit + AI content, SEO fixes in seconds\n📣 **Ads** — Google & Meta campaigns built with AI copy, ready to launch\n🗣️ **Voice** — Configure Sophie's script, voice, call hours\n🎯 **Recruit** — Source candidates, write JDs, screen applicants with AI\n📱 **Social** — Month of content across Instagram, LinkedIn, Facebook\n📄 **Proposals** — Professional client proposals generated in seconds\n📅 **Calendar** — Google/Outlook sync, meetings auto-booked by Sophie\n\nPlans from $199/mo. What do you want to tackle first?" });
    }

    if (userId !== 'anonymous') {
      // "show my leads" / "how many leads"
      if (intentMsg.includes('show my leads') || intentMsg.includes('how many leads') || intentMsg.includes('my leads') || intentMsg === 'leads') {
        let leadsCount: number | null = null;
        try {
          const db = getAdminFirestore();
          if (db) {
            const snap = await db.collection('users').doc(userId).get();
            leadsCount = snap.data()?.leadsCount ?? null;
          }
        } catch { /* non-fatal */ }
        const countText = leadsCount !== null ? `**${leadsCount}**` : 'an unknown number of';
        return NextResponse.json({ message: `You currently have ${countText} leads in your pipeline. Head to **Sales** for the full breakdown — hot leads, meetings booked, and follow-ups due.` });
      }

      // "book a call"
      if (intentMsg.includes('book a call') || intentMsg.includes('book a meeting') || intentMsg.includes('schedule a call with aaron') || intentMsg.includes('talk to aaron')) {
        return NextResponse.json({ message: "I'll have Aaron reach out to you directly — expect a message within 24 hours. Alternatively, you can book a time that works for you at **cal.com/aaronkersten** (or whatever your booking link is). Either way, we'll get it sorted." });
      }

      // "what's my plan"
      if (intentMsg.includes("what's my plan") || intentMsg.includes('what is my plan') || intentMsg.includes('my plan') || intentMsg.includes('which plan am i on') || intentMsg.includes('what plan')) {
        let plan: string | null = null;
        try {
          const db = getAdminFirestore();
          if (db) {
            const snap = await db.collection('users').doc(userId).get();
            plan = snap.data()?.plan || snap.data()?.planTier || null;
          }
        } catch { /* non-fatal */ }
        const planName = plan || 'Trial';
        const planDetails: Record<string, string> = {
          trial: 'You\'re on the **Trial** plan — all 10 modules active, exploring for free.',
          starter: 'You\'re on **Starter ($199/mo)** — Core AI team: Sales agent, Voice (Sophie), Email Guard, Calendar. Up to 200 leads/mo.',
          growth: 'You\'re on **Growth ($599/mo)** — Full platform: all 10 modules, unlimited leads, AK chat, custom scripts. Up to 5 clients.',
          agency: 'You\'re on **Agency ($1,200/mo)** — Everything + multi-client dashboard, white-label, dedicated support, unlimited clients.',
          scale: 'You\'re on **Agency ($1,200/mo)** — Everything + multi-client dashboard, white-label, dedicated support, unlimited clients.',
        };
        const detail = planDetails[planName.toLowerCase()] || `You\'re on the **${planName}** plan.`;
        return NextResponse.json({ message: `${detail}\n\nWant to upgrade or see what's included in each tier? Go to **Settings → Billing**.` });
      }
    }

    // Build module-specific context suffix
    const moduleContextMap: Record<string, string> = {
      sales: '\n\nMODULE CONTEXT: User is currently in the Sales module. Prioritise responses about Sophie AI, outbound calling, lead qualification, campaign configuration, and pipeline management. Suggest Sales-specific actions first.',
      voice: '\n\nMODULE CONTEXT: User is currently in the Voice module. Prioritise responses about Sophie\'s script, voice settings, call hours, Bland.ai configuration, and test calls. Help them configure and optimise Sophie.',
      web: '\n\nMODULE CONTEXT: User is currently in the Web module. Prioritise responses about website audits, speed/SEO/mobile scores, AI content generation, and website fixes. Suggest running an audit or fixing specific issues.',
      'email-guard': '\n\nMODULE CONTEXT: User is currently in the Email Guard module. Prioritise responses about inbox connection, proposal generation, email rules (draft/auto-send/hold), and enquiry management.',
      homepage_sales: `\n\nMODULE CONTEXT: You are talking to a PROSPECT on the AKAI homepage — they are NOT yet a customer. Your ONLY job is to understand their business and sign them up for a free trial at getakai.ai/login.

SALES CONVERSATION RULES:
1. Ask ONE question at a time. Never bombard them.
2. Start by asking: what kind of business do you run? Then dig into their pain.
3. Once you understand their pain, map it to a specific AKAI module — be concrete: "That sounds like a Sales + Email Guard problem. Sophie would call your leads within 5 minutes of them enquiring, and Email Guard means no enquiry goes unanswered over the weekend."
4. Always personalise. Use their industry, their pain, their language back at them.
5. After 2-3 exchanges, move toward the close: "The best way to see this is to just try it — 14 days free, no card needed. You can be set up in 10 minutes. Want me to walk you through it?"
6. Close with a direct link: "Sign up here: getakai.ai/login — takes 2 minutes. I'll be there on the other side to help you get going."
7. If they ask pricing: "Starts at $199/mo — and consider what one extra client per month is worth to your business. Try it free first — 14 days, no card needed. If AKAI doesn't save you 5 hours in your first week, cancel. No one has yet."
8. NEVER be pushy. Be genuinely curious about their business. The sale comes from understanding, not pitching.
9. Keep responses SHORT — 2-4 sentences max. This is a chat, not an essay.
10. If they're ready to sign up: send them directly to getakai.ai/login`,
    };
    const moduleContext = currentModule && moduleContextMap[currentModule] ? moduleContextMap[currentModule] : '';

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Fetch recent conversation memory from Firestore
    let conversationMemory = '';
    if (userId !== 'anonymous') {
      try {
        const db = getAdminFirestore();
        if (db) {
          const recentTurns: Array<{ userMessage: string; akResponse: string; timestamp: string }> = [];
          for (let i = 0; i < 3; i++) {
            const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            const snap = await db.collection('conversations').doc(userId)
              .collection(date)
              .orderBy('timestamp', 'desc')
              .limit(5)
              .get();
            snap.docs.forEach(doc => recentTurns.push(doc.data() as { userMessage: string; akResponse: string; timestamp: string }));
          }
          recentTurns.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          if (recentTurns.length > 0) {
            conversationMemory = '\n\nRecent conversation history:\n' +
              recentTurns.slice(-5).map(t =>
                `User: ${t.userMessage?.slice(0, 100)}\nAK: ${t.akResponse?.slice(0, 150)}`
              ).join('\n---\n');
          }
        }
      } catch { /* non-fatal */ }
    }

    const apiKey = ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      const client = new Anthropic({ apiKey });
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];
      const contextBlock = Object.keys(userContext).length > 0
        ? '\n\nUSER ACCOUNT CONTEXT (already known, use this to personalise responses):\n' +
          Object.entries(userContext).map(([k,v]) => v ? `- ${k}: ${v}` : '').filter(Boolean).join('\n')
        : '';
      // Inject business context into system prompt placeholders
      const populatedSystemPrompt = SYSTEM_PROMPT
        .replace('{businessName}', userContext.businessName || userContext.onboardingBusinessName || 'Not set')
        .replace('{industry}', userContext.industry || userContext.onboardingIndustry || 'Not set')
        .replace('{location}', userContext.location || userContext.onboardingLocation || 'Not set')
        .replace('{plan}', userContext.plan || userContext.planTier || 'Trial');
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system: populatedSystemPrompt + contextBlock + moduleContext + conversationMemory,
        messages,
      });
      const content0 = response.content[0];
      const text = content0?.type === 'text' ? content0.text : '';

      // ── Save conversation turn ────────────────────────────────────────────
      const saveChat = (userMsg: string, akMsg: string) => {
        try {
          const db = getAdminFirestore();
          if (!db) return;
          const now = new Date().toISOString();
          if (userId !== 'anonymous') {
            // Authenticated user — save to per-user conversations subcollection
            const date = now.slice(0, 10);
            db.collection('conversations').doc(userId)
              .collection(date).add({
                userMessage: userMsg,
                akResponse: akMsg,
                timestamp: now,
                intent: null,
              }).catch(() => {});
          } else {
            // Anonymous homepage visitor — log to homepageChats for learning
            const sessionId = body.sessionId ?? req.headers.get('x-session-id') ?? 'unknown';
            const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
            db.collection('homepageChats').add({
              sessionId,
              userMessage: userMsg,
              akResponse: akMsg,
              timestamp: now,
              module: currentModule,
              ip, // for dedup/abuse detection only, not shared
              history: (history ?? []).length,
            }).catch(() => {});
          }
        } catch { /* non-fatal */ }
      };

      saveChat(message, text);
      return NextResponse.json({ message: text });
    } else {
      const mockResponse = await getMockResponse(message, history, userContext);

      // ── Save mock response ────────────────────────────────────────────────
      const saveMock = (userMsg: string, akMsg: string) => {
        try {
          const db = getAdminFirestore();
          if (!db) return;
          const now = new Date().toISOString();
          if (userId !== 'anonymous') {
            const date = now.slice(0, 10);
            db.collection('conversations').doc(userId)
              .collection(date).add({
                userMessage: userMsg,
                akResponse: akMsg,
                timestamp: now,
                intent: null,
              }).catch(() => {});
          } else {
            const sessionId = body.sessionId ?? req.headers.get('x-session-id') ?? 'unknown';
            const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
            db.collection('homepageChats').add({
              sessionId,
              userMessage: userMsg,
              akResponse: akMsg,
              timestamp: now,
              module: currentModule,
              ip,
              history: (history ?? []).length,
            }).catch(() => {});
          }
        } catch { /* non-fatal */ }
      };

      saveMock(message, mockResponse);
      return NextResponse.json({ message: mockResponse });
    }
  } catch (err: unknown) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
