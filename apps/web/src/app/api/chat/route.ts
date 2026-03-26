import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are AK, the friendly AI assistant inside AKAI — an AI business operating system.

Your personality: Direct, warm, helpful. No corporate speak. No "I'd be happy to help!" openers. Just get to it.

Your modules: Sales (AI calling & lead gen via Sophie AI), Email Guard (inbox monitoring & auto-proposals), Recruit, Web, Ads, Social.

CRITICAL RULES:
- Never link to aiclozr.vercel.app — everything lives at getakai.ai
- Keep responses SHORT (under 120 words)
- Be conversational, not robotic
- Ask ONE question at a time, not multiple
- When someone wants to connect their email/inbox, follow this EXACT flow:

EMAIL GUARD SETUP FLOW:
Step 1: Ask "Do you want to send emails, receive and read incoming emails, or both?"
Step 2: Ask "What email do you use? Gmail, Outlook, or something else?"
Step 3: Give exact instructions for their email provider
Step 4: Before they confirm, explain what AKAI will have access to (read incoming emails forwarded to us, generate proposals) and ask for their approval
Step 5: Once approved, confirm they're set up and tell them what to expect

GMAIL INSTRUCTIONS:
1. Open Gmail → ⚙️ gear → See all settings
2. Forwarding and POP/IMAP tab
3. Add a forwarding address → type: inbound@akai.email
4. Click the confirmation link Gmail sends you
5. Select "Forward a copy of incoming mail" → Save Changes
Done — next enquiry goes straight to Email Guard.

OUTLOOK INSTRUCTIONS:
1. Settings → View all Outlook settings
2. Mail → Forwarding
3. Enable forwarding → enter: inbound@akai.email
4. Save
Done.

ACCESS CAVEAT (always share before confirming setup):
"Just so you know — once forwarding is on, AKAI will receive copies of emails sent to that address. We only read and process enquiry emails to generate proposals. We don't store, sell, or share your email data. You can turn forwarding off anytime. Are you happy to proceed?"`;

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
    return "Sure! First — do you want to **send** emails, **receive and read** incoming emails, or **both**?";
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
        return "Here's how to set up Gmail forwarding:\n\n1. Open Gmail → ⚙️ → **See all settings**\n2. Go to **Forwarding and POP/IMAP**\n3. Click **Add a forwarding address** → enter `inbound@akai.email`\n4. Click the confirmation link Gmail sends you\n5. Select **Forward a copy of incoming mail** → **Save Changes**\n\nThat's it. Your next enquiry will appear in Email Guard automatically. 🎉";
      }
      return "Here's how to set up Outlook forwarding:\n\n1. Open Outlook → **Settings** → View all Outlook settings\n2. Go to **Mail → Forwarding**\n3. Enable forwarding → enter `inbound@akai.email`\n4. Hit **Save**\n\nThat's it. Your next enquiry will appear in Email Guard automatically. 🎉";
    }
  }

  // General
  if (msg.includes('email') || msg.includes('inbox') || msg.includes('guard')) {
    return "Email Guard monitors your inbox and auto-generates proposals when enquiries arrive. Want me to walk you through connecting it?";
  }
  if (msg.includes('sales') || msg.includes('lead') || msg.includes('campaign') || msg.includes('sophie')) {
    return "The Sales module uses Sophie AI — she makes outbound calls, qualifies leads, and books meetings 24/7. Want to launch a campaign or check your pipeline?";
  }
  if (msg.includes('recruit') || msg.includes('hire')) {
    return "The Recruit module screens candidates with AI and surfaces the best ones. What role are you hiring for?";
  }
  if (msg.includes('help') || msg.includes('what can you do')) {
    return "I'm AK. I run your AKAI platform. Here's what I can do:\n\n• **Email Guard** — monitor inbox, auto-generate proposals\n• **Sales** — Sophie AI outbound calls & lead gen\n• **Recruit** — AI candidate screening\n• **Web / Ads / Social** — coming soon\n\nWhat do you need?";
  }

  return "I'm AK — ask me anything. Sales, Email Guard, or just what's working. What do you need?";
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
