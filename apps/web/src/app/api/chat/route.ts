import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// AKAI Chat — AK AI Assistant
// Uses Claude claude-3-haiku-20240307 if ANTHROPIC_API_KEY is set, otherwise
// falls back to a smart AKAI-aware mock response.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are AK, the AI assistant inside AKAI — an AI business operating system. You help users manage their modules: Sales (AI calling & lead gen), Email Guard (inbox monitoring & proposal generation), Recruit, Web, Ads, and Social. Be helpful, concise, and action-oriented. Never link to aiclozr.vercel.app — everything is inside AKAI at getakai.ai. Keep responses under 150 words.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

// Smart mock responses for when no API key is available
function getMockResponse(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes('what can you do') || msg.includes('help') || msg.includes('capabilities')) {
    return "I'm AK, your AKAI assistant. Here's what I can help with:\n\n• **Sales** — AI calling, lead gen, Sophie AI outbound\n• **Email Guard** — Monitors your inbox, auto-generates proposals\n• **Recruit** — Smart hiring workflows\n• **Web** — Site building and optimisation\n• **Ads** — Google & Meta campaign management\n• **Social** — Content scheduling and growth\n\nWhat would you like to work on?";
  }

  if (msg.includes('email') || msg.includes('inbox') || msg.includes('proposal') || msg.includes('guard')) {
    return "Email Guard monitors your inbox 24/7 and auto-generates proposals when enquiries arrive. Head to the **Email** module to connect your inbox — once live, every enquiry gets a tailored proposal within seconds. Want help setting it up?";
  }

  if (msg.includes('sales') || msg.includes('lead') || msg.includes('campaign') || msg.includes('sophie')) {
    return "The Sales module uses Sophie AI to make outbound calls, qualify leads, and book meetings — 24/7. Your live stats are on the Sales page. Want to launch a campaign or configure Sophie?";
  }

  if (msg.includes('recruit') || msg.includes('hire') || msg.includes('hiring')) {
    return "The Recruit module helps you find and hire top talent faster. AKAI automates job posting, screens applicants using AI, and surfaces the best candidates. What role are you hiring for?";
  }

  if (msg.includes('web') || msg.includes('website') || msg.includes('site')) {
    return "The Web module lets you build and optimize your business website without a developer. AKAI handles hosting, SEO basics, and conversion-focused layouts. Want to start building or improve an existing site?";
  }

  if (msg.includes('ads') || msg.includes('google') || msg.includes('meta') || msg.includes('facebook')) {
    return "The Ads module manages your Google and Meta campaigns in one place. AKAI optimizes spend, targets the right audience, and tracks ROI automatically. What's your current ad budget and primary goal?";
  }

  if (msg.includes('social') || msg.includes('instagram') || msg.includes('content')) {
    return "The Social module keeps your brand active across platforms. AKAI helps schedule posts, suggests content ideas, and tracks engagement. Which platforms are you focused on?";
  }

  if (msg.includes('price') || msg.includes('cost') || msg.includes('plan')) {
    return "AKAI offers three plans:\n\n• **Starter** — $297/mo — Core modules\n• **Growth** — $597/mo — Leads + hiring\n• **Scale** — $1,197/mo — Everything included\n\nAll plans include a 7-day free trial. Want to see which plan fits your goals?";
  }

  return "I'm AK, your AKAI assistant. I can help with Sales, Recruit, Web, Ads, and Social. What are you working on today?";
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      // Use Claude for real AI responses
      const client = new Anthropic({ apiKey });

      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return NextResponse.json({ message: text });
    } else {
      // Smart mock fallback — AKAI-aware responses without API key
      const mockMessage = getMockResponse(message);
      return NextResponse.json({ message: mockMessage });
    }
  } catch (err: unknown) {
    console.error('[/api/chat]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
