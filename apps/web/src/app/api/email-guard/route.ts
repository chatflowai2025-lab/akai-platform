import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminFirestore } from '@/lib/firebase-admin';

const RAILWAY = process.env.NEXT_PUBLIC_API_URL ?? 'https://api-server-production-2a27.up.railway.app';
const API_KEY = process.env.RAILWAY_API_KEY ?? process.env.NEXT_PUBLIC_RAILWAY_API_KEY ?? 'aiclozr_api_key_2026_prod';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

interface RawEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
}

interface TriagedEmail extends RawEmail {
  priorityScore: number;        // 1–10
  priorityLabel: 'urgent' | 'high' | 'medium' | 'low';
  aiSummary: string;
  suggestedAction: 'reply' | 'archive' | 'escalate' | 'hold';
  suggestedReply?: string;
  flagged: boolean;
}

async function triageEmail(email: RawEmail): Promise<TriagedEmail> {
  const prompt = `You are an AI email triage assistant for a business. Analyse this email and respond with a JSON object only.

Email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body?.slice(0, 1000)}

Respond ONLY with valid JSON matching this schema:
{
  "priorityScore": <number 1-10>,
  "priorityLabel": <"urgent"|"high"|"medium"|"low">,
  "aiSummary": <one sentence summary>,
  "suggestedAction": <"reply"|"archive"|"escalate"|"hold">,
  "suggestedReply": <optional short reply draft if action is reply>,
  "flagged": <true if needs immediate human attention>
}`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const firstContent = msg.content[0];
    const text = firstContent && firstContent.type === 'text' ? firstContent.text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) as Partial<TriagedEmail> : {};

    return {
      ...email,
      priorityScore: parsed.priorityScore ?? 5,
      priorityLabel: parsed.priorityLabel ?? 'medium',
      aiSummary: parsed.aiSummary ?? email.subject,
      suggestedAction: parsed.suggestedAction ?? 'hold',
      suggestedReply: parsed.suggestedReply,
      flagged: parsed.flagged ?? false,
    };
  } catch {
    return {
      ...email,
      priorityScore: 5,
      priorityLabel: 'medium',
      aiSummary: email.subject,
      suggestedAction: 'hold',
      flagged: false,
    };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
  }

  try {
    // Fetch emails from Railway API
    const res = await fetch(`${RAILWAY}/api/email/enquiries/${uid}`, {
      headers: { 'x-api-key': API_KEY },
    });

    if (!res.ok) {
      return NextResponse.json({ emails: [], flaggedCount: 0 });
    }

    const data = await res.json() as { enquiries?: RawEmail[] };
    const raw: RawEmail[] = (data.enquiries ?? []).slice(0, 20);

    if (raw.length === 0) {
      return NextResponse.json({ emails: [], flaggedCount: 0 });
    }

    // Triage with AI (limit to first 5 to avoid timeouts)
    const toTriage = raw.slice(0, 5);
    const triaged = await Promise.all(toTriage.map(e => triageEmail(e)));

    // Rest just pass through without AI triage
    const rest: TriagedEmail[] = raw.slice(5).map(e => ({
      ...e,
      priorityScore: 5,
      priorityLabel: 'medium' as const,
      aiSummary: e.subject,
      suggestedAction: 'hold' as const,
      flagged: false,
    }));

    const allEmails = [...triaged, ...rest].sort((a, b) => b.priorityScore - a.priorityScore);
    const flaggedCount = allEmails.filter(e => e.flagged).length;

    // Persist results to Firestore (wrapped in try/catch)
    try {
      const db = getAdminFirestore();
      if (db) {
        await db.collection('users').doc(uid).set(
          { emailGuard: { lastCheck: new Date().toISOString(), flaggedCount } },
          { merge: true },
        );
      }
    } catch (e) {
      console.error('[email-guard] Firestore write failed:', e);
    }

    return NextResponse.json({ emails: allEmails, flaggedCount });
  } catch (e) {
    console.error('[email-guard] Error:', e);
    return NextResponse.json({ emails: [], flaggedCount: 0 });
  }
}

interface ActionRequest {
  uid: string;
  emailId: string;
  action: 'archive' | 'reply' | 'escalate';
  replyText?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as ActionRequest;
    const { uid, emailId, action, replyText } = body;

    if (!uid || !emailId || !action) {
      return NextResponse.json({ error: 'uid, emailId, and action are required' }, { status: 400 });
    }

    // Log action to Firestore (wrapped in try/catch)
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection('users')
          .doc(uid)
          .collection('emailGuardActions')
          .add({
            emailId,
            action,
            replyText: replyText ?? null,
            timestamp: new Date().toISOString(),
          });
      }
    } catch (e) {
      console.error('[email-guard] Action log Firestore write failed:', e);
    }

    // Forward action to Railway API
    if (action === 'reply' && replyText) {
      try {
        await fetch(`${RAILWAY}/api/email/enquiries/${uid}/${emailId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
          body: JSON.stringify({ proposalBody: replyText }),
        });
      } catch {
        // Non-fatal — action still logged
      }
    }

    return NextResponse.json({ success: true, action });
  } catch (e) {
    console.error('[email-guard] POST error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
