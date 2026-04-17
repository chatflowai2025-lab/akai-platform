export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface BugReportBody {
  error?: string;
  componentStack?: string;
  route?: string;
  userId?: string;
  description?: string;
  timestamp?: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function triageBug(error: string, route: string, description?: string): Promise<{ priority: number; suggestion: string }> {
  try {
    const prompt = `You are a senior engineer triaging a bug report for the AKAI platform (Next.js + Firebase + Anthropic AI SaaS).

Bug details:
- Route: ${route}
- Error: ${error}${description ? `\n- Description: ${description}` : ''}

Score the priority from 1-10 (10 = critical/data loss, 1 = cosmetic) and suggest a quick fix.
Reply with JSON only: { "priority": <number>, "suggestion": "<one sentence fix suggestion>" }`;

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { priority?: number; suggestion?: string };
      return {
        priority: Math.min(10, Math.max(1, Number(parsed.priority) || 5)),
        suggestion: parsed.suggestion ?? 'Review the error and fix the root cause.',
      };
    }
  } catch (err) {
    console.error('[bugs/report] Anthropic triage error:', err);
  }

  // Fallback scoring
  const errorLower = error.toLowerCase();
  let priority = 5;
  if (errorLower.includes('cannot read') || errorLower.includes('is undefined') || errorLower.includes('null')) priority = 7;
  if (errorLower.includes('firebase') || errorLower.includes('firestore')) priority = 8;
  if (errorLower.includes('auth') || errorLower.includes('token')) priority = 9;

  return { priority, suggestion: 'Review the stack trace and fix the root cause.' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BugReportBody;

    const error = body.error ?? body.description ?? 'Unknown error';
    const route = body.route ?? 'unknown';
    const userId = body.userId ?? null;
    const componentStack = body.componentStack ?? null;
    const description = body.description ?? null;
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    // Auto-triage with Claude
    const { priority, suggestion } = await triageBug(error, route, description ?? undefined);

    // Save to Firestore
    let docId = `bug-${Date.now()}`;
    try {
      const db = getAdminFirestore();
      if (db) {
        const bugData = {
          error,
          componentStack,
          route,
          userId,
          description,
          timestamp: FieldValue.serverTimestamp(),
          clientTimestamp: timestamp.toISOString(),
          status: 'open',
          priority,
          suggestion,
        };
        const docRef = await db.collection('bugReports').add(bugData);
        docId = docRef.id;
      }
    } catch (fsErr) {
      console.error('[bugs/report] Firestore write error:', fsErr);
      // Non-fatal — still return the triage result
    }

    return NextResponse.json({ id: docId, priority, suggestion });
  } catch (err) {
    console.error('[bugs/report] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
