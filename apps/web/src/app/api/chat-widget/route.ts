export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRequestScope } from '@/lib/safety-gates';
import { getAdminFirestore } from '@/lib/firebase-admin';

const DISCORD_ALERT_WEBHOOK =
  process.env.DISCORD_ALERT_WEBHOOK ||
  'https://discord.com/api/webhooks/1487067273398063244/bcPm17Vawtt7Xq-sri56RRJ2ejIOM5LJj728BX7-6xaQHaOxkmtr8HPs8jDlVP_vBhNm';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface VisitorInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface WidgetChatRequest {
  message: string;
  clientId: string;
  conversationHistory?: ConversationMessage[];
  visitorInfo?: VisitorInfo;
}

interface ClientConfig {
  businessName: string;
  industry: string;
  location: string;
  greeting: string;
  brandColor: string;
  responseStyle: string;
}

interface LeadData {
  name: string;
  email: string;
  phone?: string;
}

// Default config when Firestore is unavailable
function getDefaultConfig(_clientId: string): ClientConfig {
  return {
    businessName: 'this business',
    industry: 'services',
    location: 'Australia',
    greeting: "Hi! How can I help you today?",
    brandColor: '#0a1628',
    responseStyle: 'Friendly',
  };
}

// Fetch config from Firestore via server-side firebase-admin (or skip gracefully)
async function getClientConfig(clientId: string): Promise<ClientConfig> {
  try {
    // Try to load from Firestore using REST API
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId || !clientId || clientId === 'demo') {
      return getDefaultConfig(clientId);
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${clientId}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return getDefaultConfig(clientId);

    const data = await res.json();
    const fields = data.fields || {};
    const chatConfig = fields.chatConfig?.mapValue?.fields || {};

    return {
      businessName: fields.businessName?.stringValue || getDefaultConfig(clientId).businessName,
      industry: fields.campaignConfig?.mapValue?.fields?.industry?.stringValue || 'services',
      location: fields.campaignConfig?.mapValue?.fields?.location?.stringValue || 'Australia',
      greeting: chatConfig.greeting?.stringValue || getDefaultConfig(clientId).greeting,
      brandColor: chatConfig.brandColor?.stringValue || '#0a1628',
      responseStyle: chatConfig.responseStyle?.stringValue || 'Friendly',
    };
  } catch {
    return getDefaultConfig(clientId);
  }
}

function buildSystemPrompt(config: ClientConfig): string {
  const toneMap: Record<string, string> = {
    Friendly: 'warm, conversational, and approachable',
    Professional: 'professional, clear, and concise',
    Concise: 'brief, direct, and to the point',
  };
  const tone = toneMap[config.responseStyle] || toneMap.Friendly;

  return `You are a ${tone} AI assistant for ${config.businessName}, a ${config.industry} business in ${config.location}. Your job is to help visitors and qualify them as potential leads.

CONVERSATION FLOW:
1. Greet warmly and ask what brings them here today
2. Understand their need or problem
3. Explain how ${config.businessName} can help
4. Naturally collect their contact info to follow up

BOOKING CALENDAR:
- There is a booking calendar on the RIGHT side of this page where visitors can pick a time to meet
- If anyone asks about timing, availability, speaking to someone, or booking a meeting — point them to the calendar: "You can pick a time that works for you on the right →"
- Keep it simple and direct — don't over-explain

LEAD CAPTURE RULES:
- Once you have their name AND email (phone is optional), output this EXACT signal on a new line:
  LEAD_CAPTURED: {"name": "their name", "email": "their@email.com", "phone": "optional phone or null"}
- Only output LEAD_CAPTURED once — after you genuinely have their name and contact details
- After capturing, say: "Thanks [name]! Someone from our team will be in touch very shortly."
- Keep responses SHORT — 2-3 sentences max
- Be helpful and human, not robotic
- If they ask about pricing or specifics you don't know, say "Our team will fill you in when they reach out"
- If they want to speak to someone or book a time — direct them to the calendar on the right

TONE: ${tone}`;
}

function getMockResponse(message: string, history: ConversationMessage[], config: ClientConfig): string {
  const msg = message.toLowerCase();
  const historyLen = history.length;

  if (historyLen === 0) {
    return `Hi there! I'm ${config.businessName}'s AI assistant. What brings you here today?`;
  }

  if (msg.includes('price') || msg.includes('cost') || msg.includes('how much')) {
    return "Great question! Our team will give you exact pricing based on your needs. To get you connected with the right person, could I grab your name and email?";
  }

  if (msg.includes('help') || msg.includes('interest') || msg.includes('looking')) {
    return `I'd love to help! To make sure we follow up with the right info, what's your name?`;
  }

  // Check if we have a name in the last few messages
  const hasName = history.some(h => h.role === 'user' && h.content.length > 1 && h.content.length < 50 && !h.content.includes(' '));
  if (hasName && (msg.includes('@') || msg.includes('email'))) {
    const nameMsg = history.find(h => h.role === 'user' && h.content.length < 30);
    const name = nameMsg?.content || 'there';
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      return `LEAD_CAPTURED: {"name": "${name}", "email": "${emailMatch[0]}", "phone": null}\n\nThanks ${name}! Someone from the team will be in touch very shortly. 🙌`;
    }
  }

  if (msg.match(/^[a-zA-Z\s]{2,30}$/) && historyLen < 6) {
    return "Nice to meet you! What's your email so we can follow up with more details?";
  }

  return "I'd be happy to help connect you with the team. Could I get your name and email so they can reach out directly?";
}

export async function POST(req: NextRequest) {
  try {
    const body: WidgetChatRequest = await req.json();
    const { message, clientId, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Safety gate — widget visitors are treated as 'trial' plan
    const widgetUserId = clientId || 'widget-anonymous';
    const safetyCheck = checkRequestScope(widgetUserId, message, 'trial');
    if (!safetyCheck.allowed) {
      // Alert to Discord #ak-mm
      const alertMsg = `🚨 **Safety Gate Triggered (Chat Widget)**\n\n**ClientId:** ${widgetUserId}\n**Plan:** trial\n**Message:** ${message.substring(0, 200)}\n**Reason:** ${safetyCheck.reason}\n**Time:** ${new Date().toISOString()}`;
      fetch(DISCORD_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: alertMsg }),
      }).catch(() => {});

      // Log to Firestore
      const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
      const db = getAdminFirestore();
      if (db) {
        db.collection('security_events').add({
          userId: widgetUserId,
          userPlan: 'trial',
          message: message.substring(0, 500),
          reason: safetyCheck.reason,
          timestamp: new Date().toISOString(),
          ip,
          source: 'chat-widget',
        }).catch(() => {});
      }

      return NextResponse.json({ error: safetyCheck.reason }, { status: 403 });
    }

    const config = await getClientConfig(clientId);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    let responseText = '';
    let leadCaptured = false;
    let leadData: LeadData | null = null;

    if (apiKey) {
      const client = new Anthropic({ apiKey });

      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...conversationHistory.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: buildSystemPrompt(config),
        messages,
      });

      const content0 = response.content[0];
      responseText = content0?.type === 'text' ? content0.text : '';
    } else {
      responseText = getMockResponse(message, conversationHistory, config);
    }

    // Parse LEAD_CAPTURED signal
    const leadMatch = responseText.match(/LEAD_CAPTURED:\s*(\{[^}]+\})/);
    if (leadMatch) {
      try {
        const parsed = JSON.parse(leadMatch[1] ?? '');
        if (parsed.name && parsed.email) {
          leadCaptured = true;
          leadData = {
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone || undefined,
          };
        }
      } catch {
        // ignore parse errors
      }
      // Clean the signal from the response
      responseText = responseText.replace(/LEAD_CAPTURED:\s*\{[^}]+\}\n?/, '').trim();
    }

    // Save lead to Railway if captured
    if (leadCaptured && leadData) {
      try {
        const railwayUrl = process.env.RAILWAY_API_URL || 'https://api-server-production-2a27.up.railway.app';
        await fetch(`${railwayUrl}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...leadData,
            clientId,
            businessName: config.businessName,
            source: 'chat-widget',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error('[chat-widget] Failed to save lead:', err);
        // Don't fail the response — lead capture notification to user still shows
      }
    }

    return NextResponse.json({
      message: responseText,
      leadCaptured,
      leadData: leadCaptured ? leadData : undefined,
    });
  } catch (err) {
    console.error('[/api/chat-widget]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
