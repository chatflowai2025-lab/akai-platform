import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are AK, the AI brain inside AKAI — a fully autonomous AI business operating system that runs businesses 24/7.

PERSONALITY: Direct, warm, confident. Like a brilliant COO who gets things done. No filler phrases. Just results.

YOUR MODULES:
- Sales: Sophie AI makes outbound calls, qualifies leads, books meetings. Powered by Bland.ai. Users upload leads → Sophie calls them → qualified leads notified via Telegram.
- Email Guard: Connects to Microsoft/Gmail via OAuth. Reads enquiries, generates proposals with Claude, sends replies from the user's address.
- Recruit: Find candidates OR screen inbound applicants. AI-powered scoring.
- Web: Website audit + content generation.
- Ads: Google Ads campaign builder.
- Social: Content generation for Instagram, LinkedIn, Facebook.

CAMPAIGN LAUNCH FLOW (when user says launch/new campaign/configure Sophie):
1. "Let me check your setup..." → Present their onboarding config back: business name, industry, location, target customer
2. Ask: "Is this still right, or do you want to update anything?"
3. Ask: "Do you have a list of leads to call, or should I find them for you?"
4. Ask: "What should Sophie say in the opening 10 seconds?" (or offer a default script)
5. Ask: "What hours should Sophie call? Default is Mon-Fri 9am-5pm [their timezone]"
6. Confirm all settings → "Ready to launch. Sophie will start calling within the hour. I'll notify you on Telegram when the first lead qualifies."
7. POST the campaign to /api/campaign/save with their config

EMAIL GUARD SETUP FLOW (when user asks to connect inbox):
1. "Do you want to send, receive, or both?"
2. "What device — Mac, iPhone, Windows, Android?"
3. "What email app — Gmail, Outlook, Apple Mail?"
4. Show tailored instructions for their setup
5. Explain access: AKAI only reads emails to generate proposals, never stores or shares data
6. Get approval, confirm connected

RULES ENGINE (after inbox connected):
When user describes how they want emails handled, extract the rule and save it:
- "draft only" → action: draft, no auto-send
- "auto-send" → action: auto_send
- "notify me" → notify: telegram=true
- "forward to [name]" → action: forward, forwardTo: [email]
- "hold until 9am" → action: hold, holdUntil: 9am

CRITICAL RULES:
- Never mention aiclozr.vercel.app — everything is at getakai.ai
- Keep responses under 150 words
- Ask ONE question at a time
- Be the smartest person in the room but never show off
- When you save something, confirm it clearly: "✅ Done — [what was saved]"
- If Claude API is available, use it for all responses. The mock fallback is only for emergencies.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

function getMockResponse(message: string, history: ChatMessage[]): string {
  const msg = message.toLowerCase();
  const lastAssistant = history.filter(h => h.role === 'assistant').pop()?.content?.toLowerCase() ?? '';

  // Email Guard setup flow
  if (msg.includes('connect') && (msg.includes('inbox') || msg.includes('email'))) {
    return "Sure! First — do you want to **send** emails, **receive and read** incoming emails, or **both**?\n\nNote: I\'ll get you the exact forwarding address once I know your setup.";
  }

  if (lastAssistant.includes('send') && lastAssistant.includes('receive')) {
    if (msg.includes('both') || msg.includes('send and receive') || msg.includes('receive and send')) {
      return "Got it — both directions. What email do you use? **Gmail**, **Outlook**, or something else?";
    }
    if (msg.includes('send')) {
      return "Sending only — noted. What email do you use? **Gmail**, **Outlook**, or something else?";
    }
    if (msg.includes('receive') || msg.includes('incoming') || msg.includes('read')) {
      return "Incoming emails only — that's Email Guard's sweet spot. What email do you use? **Gmail**, **Outlook**, or something else?";
    }
  }

  if (lastAssistant.includes('gmail') && lastAssistant.includes('outlook')) {
    if (msg.includes('gmail')) {
      return "Before we set up, quick heads up — once forwarding is on, AKAI receives copies of emails sent to that address. We only use them to generate proposals. We don't store, sell or share your data. You can turn it off anytime.\n\n**Are you happy to proceed?**";
    }
    if (msg.includes('outlook')) {
      return "Before we set up, quick heads up — once forwarding is on, AKAI receives copies of emails sent to that address. We only use them to generate proposals. We don't store, sell or share your data. You can turn it off anytime.\n\n**Are you happy to proceed?**";
    }
  }

  if (lastAssistant.includes('happy to proceed') || lastAssistant.includes('are you happy')) {
    if (msg.includes('yes') || msg.includes('ok') || msg.includes('sure') || msg.includes('proceed') || msg.includes('go')) {
      const prevUserMsgs = history.filter(h => h.role === 'user').map(h => h.content.toLowerCase());
      const usedGmail = prevUserMsgs.some(m => m.includes('gmail'));
      if (usedGmail) {
        return "Here's how to set up Gmail forwarding:\n\n1. Open Gmail → ⚙️ → **See all settings**\n2. Go to **Forwarding and POP/IMAP**\n3. Click **Add a forwarding address** → enter `inbox@getakai.ai` *(your account manager will confirm the exact address)*\n4. Click the confirmation link Gmail sends you\n5. Select **Forward a copy of incoming mail** → **Save Changes**\n\nThat's it. Your next enquiry will appear in Email Guard automatically. 🎉";
      }
      return "Here's how to set up Outlook forwarding:\n\n1. Open Outlook → **Settings** → View all Outlook settings\n2. Go to **Mail → Forwarding**\n3. Enable forwarding → enter `inbox@getakai.ai` *(your account manager will confirm the exact address)*\n4. Hit **Save**\n\nThat's it. Your next enquiry will appear in Email Guard automatically. 🎉";
    }
  }

  // ── Campaign launcher ────────────────────────────────────────────────────
  if (msg.includes('launch campaign') || msg.includes('new campaign') || msg.includes('configure sophie')) {
    return "Based on your onboarding setup, here's what Sophie is configured with:\n\n📋 **Campaign summary**\n• **Target:** Australian SMBs — kitchens, renovations, luxury trades\n• **Contact list:** 150 leads (Mosman, Paddington, Double Bay)\n• **Script:** Warm intro → qualify budget → book site visit\n• **Call hours:** Mon–Fri, 9am–5pm AEST\n• **Fallback:** SMS if no answer after 2 attempts\n\nWant to change anything, or should I launch Sophie now?";
  }

  if (lastAssistant.includes('launch sophie now') || lastAssistant.includes('want to change anything')) {
    if (msg.includes('launch') || msg.includes('looks good') || msg.includes('go') || msg.includes('yes') || msg.includes('do it')) {
      return "✅ Sophie is launching now.\n\nShe'll start working through your list today. I'll send you a Telegram notification when the first meeting is booked — usually within a few hours.\n\nYou can check live call stats in the Sales dashboard anytime.";
    }
    if (msg.includes('add another list') || msg.includes('more contacts') || msg.includes('more leads')) {
      return "Want to add another contact list? We can load 50 more targeted leads for **+$149/mo**.\n\nThat covers scraping, enrichment, and DNC filtering. Want me to set that up before we launch?";
    }
  }

  if (msg.includes('add another list') || msg.includes('more contacts') || msg.includes('more leads')) {
    return "We can add 50 more targeted leads to your campaign for **+$149/mo** — includes scraping, enrichment, and DNC filtering.\n\nWant me to queue that up?";
  }

  // ── Inbox rules (post-connect) ────────────────────────────────────────────
  if (msg.includes('draft only') || msg.includes('draft mode')) {
    return "✅ Rule saved: **Draft only — don't auto-send**. AKAI will generate proposals and hold them for your review before anything goes out. Applied to all new enquiries.";
  }
  if (msg.includes('auto-send') || msg.includes('auto send') || msg.includes('send automatically')) {
    return "✅ Rule saved: **Auto-send proposals** as soon as they're generated. No manual review needed. Applied to all new enquiries.";
  }
  if (msg.includes('notify me') || msg.includes('send me a notification') || msg.includes('alert me')) {
    return "✅ Rule saved: **Notify on new enquiry** — you'll get a Telegram message every time a new proposal is ready. Applied to all new enquiries.";
  }
  if (msg.includes('hold until 9') || msg.includes('send at 9') || msg.includes('wait until morning') || msg.includes('9am')) {
    return "✅ Rule saved: **Hold until 9am AEST** — proposals are generated immediately but only sent when business hours start. Applied to all new enquiries.";
  }

  // ── General ───────────────────────────────────────────────────────────────
  if (msg.includes('email') || msg.includes('inbox') || msg.includes('guard')) {
    return "Email Guard monitors your inbox and auto-generates proposals when enquiries arrive. Want me to walk you through connecting it?";
  }
  if (msg.includes('sales') || msg.includes('lead') || msg.includes('campaign') || msg.includes('sophie')) {
    return "The Sales module uses Sophie AI — she makes outbound calls, qualifies leads, and books meetings 24/7. Want to launch a campaign or check your pipeline?";
  }
  // ── Recruit flows ─────────────────────────────────────────────────────────
  if (msg.includes('find candidates') || (msg.includes('find') && msg.includes('candidate'))) {
    return "Let's find you the right people. What role are you hiring for? Give me the job title and I'll start matching.";
  }
  if (msg.includes('post a job') || msg.includes('post job') || (msg.includes('post') && msg.includes('role'))) {
    return "Got it — let's post the role. Switch to the **Post a Job** tab and fill in the details. Once it's live, you'll get a unique apply link to share. AKAI AI-screens every applicant against your requirements.";
  }
  if (msg.includes('screen applicants') || msg.includes('screen candidates') || (msg.includes('screen') && (msg.includes('applicant') || msg.includes('candidate')))) {
    return "AI screening works like this: every applicant submits their details → AKAI scores them against your job requirements (0–100%) → you only see the top matches.\n\nI flag: matched skills, experience gaps, and a recommended next step (interview, call, or pass). Want me to screen your current applicants?";
  }
  if (msg.startsWith('find candidates for:') || msg.startsWith('contact candidate:')) {
    const isFinding = msg.startsWith('find candidates for:');
    if (isFinding) {
      const role = msg.replace('find candidates for:', '').trim();
      return `On it. Searching for ${role} — AI is matching against location, skills, and salary fit. Results are ranked by match score. Use **Contact candidate** on any card to flag them for outreach.`;
    }
    const details = msg.replace('contact candidate:', '').trim();
    return `📬 Flagged ${details} for outreach. I'll prep a personalised intro message based on their profile and your role requirements. Want me to draft it now?`;
  }
  if (msg.startsWith('posted new job:')) {
    const jobInfo = msg.replace('posted new job:', '').trim();
    return `✅ Job live: **${jobInfo}**\n\nShare your apply link with candidates or post it to LinkedIn/Seek. Every applicant gets AI-screened the moment they submit. I'll notify you when top matches arrive.`;
  }
  if (msg.startsWith('screen applicants for job:')) {
    const jobTitle = msg.replace('screen applicants for job:', '').trim();
    return `Screening applicants for **${jobTitle}**. Here's how it works:\n\n1. Applicant submits via your apply link\n2. AI scores them 0–100% against your requirements\n3. Scores 80%+ → auto-advance to interview stage\n4. 60–79% → flagged for your review\n5. Below 60% → polite rejection sent automatically\n\nNo applicants yet? Share your apply link to start receiving submissions.`;
  }
  if (msg.includes('recruit') || msg.includes('hire') || msg.includes('hiring') || msg.includes('recruitment')) {
    return "Recruit does two things:\n\n🔍 **Find Candidates** — tell me what role you need, AKAI sources and ranks matches by fit score\n📋 **Post a Job** — publish a role, get a unique apply link, AI screens every inbound applicant\n\nWhat do you need — find someone, or post a role?";
  }
  // ── Social content ───────────────────────────────────────────────────────
  if (msg.includes('create a post') || msg.includes('social content') || msg.includes('write a post') || 
      msg.includes('instagram') || msg.includes('linkedin post') || msg.includes('facebook post') ||
      (msg.includes('social') && (msg.includes('post') || msg.includes('content') || msg.includes('write')))) {
    return "What do you want to post about? I'll write it for **Instagram**, **LinkedIn**, and **Facebook** — each optimised for that platform's audience.";
  }

  if (lastAssistant.includes('instagram') && lastAssistant.includes('linkedin') && lastAssistant.includes('facebook') &&
      (lastAssistant.includes('what do you want to post about') || lastAssistant.includes("i'll write it"))) {
    return `On it! Heading to the Social module to generate content about: *"${message}"*\n\nGo to **Social** in the sidebar → paste your topic → hit Generate. Want me to open it for you?`;
  }

  if (msg.includes('help') || msg.includes('what can you do')) {
    return "I'm AK. I run your AKAI platform. Here's what I can do:\n\n• **Email Guard** — monitor inbox, auto-generate proposals\n• **Sales** — Sophie AI outbound calls & lead gen\n• **Recruit** — AI candidate screening\n• **Social** — AI-generated posts for Instagram, LinkedIn & Facebook\n• **Web / Ads** — coming soon\n\nWhat do you need?";
  }

  return "I'm AK — ask me anything. Sales, Email Guard, Social, or just what's working. What do you need?";
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      const client = new Anthropic({ apiKey });
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return NextResponse.json({ message: text });
    } else {
      return NextResponse.json({ message: getMockResponse(message, history) });
    }
  } catch (err: unknown) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
