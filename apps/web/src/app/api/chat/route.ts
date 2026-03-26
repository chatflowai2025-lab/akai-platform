import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are AK, the AI brain inside AKAI — a fully autonomous AI business operating system that runs businesses 24/7.

PERSONALITY: Direct, warm, confident. Like a brilliant COO who gets things done. No filler phrases. Just results.

YOUR MODULES:
- Sales: Sophie AI makes outbound calls, qualifies leads, books meetings. Powered by Bland.ai. Users upload leads → Sophie calls them → qualified leads notified via Email, SMS, or WhatsApp (user's preference).
- Email Guard: Connects to Microsoft/Gmail via OAuth. Reads enquiries, generates proposals with Claude, sends replies from the user's address.
- Recruit: Two modes — (1) Find Candidates: enter job title + location + skills, AI sources and ranks candidates by match score with outreach drafting; (2) Post a Job: enter job details, AI writes a full JD, choose platforms (SEEK, LinkedIn, Indeed, Jora, Your Website), click post. AI screens every inbound applicant and scores 0–100%. Powered by /api/recruit/generate-jd and /api/recruit/screen.
- Web: Website audit + content generation.
- Ads: AI-powered Google Ads and Meta/Facebook Ads campaign builder. Users enter business name, goal (leads/sales/awareness), target audience, location, and daily budget ($5–$200/day via slider). AI generates full campaign: Google = 3 ad groups with 5 headlines + 2 descriptions + 8 keywords each. Meta = 3 ad sets with primary text + headline + description + CTA. Campaign is previewed, then launched via 'Launch Campaign' button. Powered by /api/ads/generate and /api/ads/create.
- Social: Content generation for Instagram, LinkedIn, Facebook.
- Chat Widget: Embeddable AI chat widget for client websites. Qualifies visitors as leads, routes to Sophie. Install via a script tag from the Chat module.

CAMPAIGN LAUNCH FLOW (when user says launch/new campaign/configure Sophie):
1. "Let me check your setup..." → Present their onboarding config back: business name, industry, location, target customer
2. Ask: "Is this still right, or do you want to update anything?"
3. Ask: "Do you have a list of leads to call, or should I find them for you?"
4. Ask: "What should Sophie say in the opening 10 seconds?" (or offer a default script)
5. Ask: "What hours should Sophie call? Default is Mon-Fri 9am-5pm [their timezone]"
6. Confirm all settings → "Ready to launch. Sophie will start calling within the hour. I'll notify you via your preferred channel (Email, SMS, or WhatsApp) when the first lead qualifies."
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
- "notify me" → notify: email/sms/whatsapp based on user preference
- "forward to [name]" → action: forward, forwardTo: [email]
- "hold until 9am" → action: hold, holdUntil: 9am

PRICING & LEAD LIMITS:
- Starter $297/mo = 50 leads/month included
- Growth $597/mo = 150 leads/month included
- Scale $1,197/mo = 500 leads/month included
- Extra leads (any plan): $3/lead — generate a Stripe payment link on request
- When user uploads leads, check against their plan limit
- If they exceed limit: "You've uploaded [N] leads. Your [Plan] plan includes [X]/mo. That's [excess] extra leads at $3 each = $[total]. Want to proceed? I'll send a payment link."
- If they ask for more leads: "Adding [N] extra leads is $[N×3]. Want me to generate a payment link?"

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

CRITICAL RULES:
- Never mention aiclozr.vercel.app — everything is at getakai.ai
- Keep responses under 200 words
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
  userContext?: Record<string, string>;
  state?: Record<string, unknown>;
}

// ── Smart mock response engine ────────────────────────────────────────────────
function getMockResponse(message: string, history: ChatMessage[], userContext: Record<string, string> = {}): string {
  const msg = message.toLowerCase().trim();
  const lastAssistant = history.filter(h => h.role === 'assistant').pop()?.content?.toLowerCase() ?? '';
  const prevUserMsgs = history.filter(h => h.role === 'user').map(h => h.content.toLowerCase());

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
    const topic = postTopicMatch[1].trim();
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
    return "Your current plan includes **50 contacts/month**. Adding another list of 50 targeted leads is **+$149/mo** — includes lead research, enrichment, and DNC filtering.\n\nWant me to add it before we launch?";
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
    return "Sure. First — do you want to **send** emails, **receive and read** incoming emails, or **both**?";
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

  // ── Social content ───────────────────────────────────────────────────────
  if (msg.includes('create a post') || msg.includes('write a post') || msg.includes('social content') ||
      msg.includes('instagram post') || msg.includes('linkedin post') || msg.includes('facebook post')) {
    return "What's the topic? I'll write it optimised for **Instagram**, **LinkedIn**, and **Facebook** — different angle for each platform. Or just use the Social module → Content Generator for instant results.";
  }

  // ── Web module responses ──────────────────────────────────────────────────
  if (msg.startsWith('fix the "') && msg.includes('" issue on my website')) {
    const issueMatch = message.match(/fix the "(.+?)" issue on my website/i);
    const issue = issueMatch ? issueMatch[1] : 'this issue';
    const scoreType = issue.toLowerCase().includes('meta') || issue.toLowerCase().includes('seo') ? 'SEO' :
                      issue.toLowerCase().includes('image') || issue.toLowerCase().includes('lcp') ? 'Speed' : 'Mobile';
    const points = Math.floor(Math.random() * 8) + 5;
    return `Here's what I'd change for **"${issue}"**:\n\nI'll update the relevant files to address this directly. This will improve your **${scoreType}** score by ~${points} points.\n\nWant me to apply it? I'll create a backup first so you can roll back instantly if needed.`;
  }

  if (msg.startsWith('auto-fix the top 3 issues on my website')) {
    const issuesMatch = message.match(/auto-fix the top 3 issues on my website: (.+)/i);
    const issues = issuesMatch ? issuesMatch[1] : 'your top issues';
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

  // ── Ads module ───────────────────────────────────────────────────────────
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
    const body: ChatRequest = await req.json();
    const { message, history = [], userContext = {} } = body;

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
      const contextBlock = Object.keys(userContext).length > 0
        ? '\n\nUSER ACCOUNT CONTEXT (already known, use this to personalise responses):\n' +
          Object.entries(userContext).map(([k,v]) => v ? `- ${k}: ${v}` : '').filter(Boolean).join('\n')
        : '';
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system: SYSTEM_PROMPT + contextBlock,
        messages,
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return NextResponse.json({ message: text });
    } else {
      return NextResponse.json({ message: getMockResponse(message, history, userContext) });
    }
  } catch (err: unknown) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
