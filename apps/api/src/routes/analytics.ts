import { Router, Request, Response } from 'express';
import { getFirebaseAdmin } from '../lib/firebase';

import type { Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

async function callClaude(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '';
  if (!key) return '';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json() as any;
  return (data?.content?.[0] as any)?.text || '';
}

// ── Helper: Get recent conversations from Firestore ──────────────────────────
async function getRecentConversations(userId: string, days = 7) {
  let db: any = null; try { db = getFirebaseAdmin().firestore(); } catch { }
  if (!db) return [];

  const conversations: Array<{ userMessage: string; akResponse: string; timestamp: string; intent?: string }> = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    
    try {
      const snap = await db.collection('conversations').doc(userId)
        .collection(dateStr).orderBy('timestamp' as string, 'desc' as any).limit(20).get();
      snap.forEach((doc: any) => conversations.push(doc.data() as any));
    } catch { /* date may not exist */ }
  }
  return conversations;
}

// ── Helper: Get module events from Firestore ─────────────────────────────────
async function getModuleEvents(userId: string, days = 7) {
  let db: any = null; try { db = getFirebaseAdmin().firestore(); } catch { }
  if (!db) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  try {
    const snap = await db.collection('users').doc(userId)
      .collection('events')
      .where('timestamp', '>=', (cutoff.toISOString() as string))
      .orderBy('timestamp' as string, 'desc' as any)
      .limit(100)
      .get();
    return snap.docs.map((d: any) => d.data());
  } catch { return []; }
}

// ── GET /api/analytics/learnings/:userId ─────────────────────────────────────
// Returns weekly score, top insight, next action, patterns
// Used by: Dashboard Intelligence Panel
router.get('/learnings/:userId', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };

  try {
    const [conversations, events] = await Promise.all([
      getRecentConversations(userId, 7),
      getModuleEvents(userId, 7),
    ]);

    let db: any = null; try { db = getFirebaseAdmin().firestore(); } catch { }
    let userContext: Record<string, any> = {};
    if (db) {
      const userDoc = await db.collection('users').doc(userId).get();
      userContext = userDoc.data() || {};
    }

    // Calculate weekly score based on activity
    const activityScore = Math.min(100, (conversations.length * 5) + (events.length * 2));
    const connectedCount = [
      userContext.gmail?.connected,
      userContext.googleCalendarConnected,
      userContext.inboxConnection?.connected,
    ].filter(Boolean).length;
    const setupScore = Math.round((connectedCount / 3) * 30);
    const weeklyScore = Math.min(100, activityScore + setupScore + 20);

    // If no activity yet, return baseline
    if (conversations.length === 0 && events.length === 0) {
      res.json({
        weeklyScore,
        topInsight: 'Connect your email and calendar to unlock AKAI\'s full intelligence.',
        nextAction: 'Go to Email Guard to connect Gmail or Outlook.',
        patterns: [
          { type: 'setup', insight: 'Complete your onboarding to activate all 10 AKAI agents.', confidence: 0.95 },
        ],
      });
      return;
    }

    // Use Claude to generate intelligent patterns from conversation history
    const conversationSummary = conversations.slice(0, 10).map(c =>
      `User: ${c.userMessage?.slice(0, 100)}\nAK: ${c.akResponse?.slice(0, 100)}`
    ).join('\n---\n');

    const prompt = `You are AKAI's intelligence system. Analyse this user's recent activity and generate insights.

Business context:
- Business: ${userContext.onboarding?.businessName || 'Unknown'}
- Industry: ${userContext.onboarding?.industry || 'Unknown'}
- Connected: Gmail=${!!userContext.gmail?.connected}, Calendar=${!!userContext.googleCalendarConnected}, Outlook=${!!userContext.inboxConnection?.connected}
- Conversations last 7 days: ${conversations.length}
- Module events last 7 days: ${events.length}

Recent conversations:
${conversationSummary || 'None yet'}

Generate a JSON response (no other text) with:
{
  "topInsight": "One specific, actionable insight about this business (1-2 sentences)",
  "nextAction": "The single most important next action they should take today",
  "patterns": [
    { "type": "opportunity|warning|win|tip", "insight": "Specific pattern observed", "confidence": 0.0-1.0 }
  ]
}

Be specific to their business. Reference actual things from their conversations if present. Max 3 patterns.`;

    let aiInsights = {
      topInsight: 'Your business is active — keep engaging with AKAI to unlock deeper insights.',
      nextAction: 'Ask AK to analyse your pipeline and suggest today\'s top priority.',
      patterns: [] as Array<{ type: string; insight: string; confidence: number }>,
    };

    try {
      const text = await callClaude(prompt);
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      if (jsonStart >= 0) {
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));
        aiInsights = { ...aiInsights, ...parsed };
      }
    } catch { /* use defaults */ }

    res.json({
      weeklyScore,
      topInsight: aiInsights.topInsight,
      nextAction: aiInsights.nextAction,
      patterns: aiInsights.patterns,
    });

  } catch (err: any) {
    console.error('[analytics/learnings]', err.message);
    res.status(500).json({ error: 'Failed to generate learnings' });
  }
});

// ── GET /api/analytics/insights/:userId ──────────────────────────────────────
// Returns structured insights list + stats + period
// Used by: Dashboard Intelligence section
router.get('/insights/:userId', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };

  try {
    const [conversations, events] = await Promise.all([
      getRecentConversations(userId, 30),
      getModuleEvents(userId, 30),
    ]);

    let db: any = null; try { db = getFirebaseAdmin().firestore(); } catch { }
    let userContext: Record<string, any> = {};
    if (db) {
      const userDoc = await db.collection('users').doc(userId).get();
      userContext = userDoc.data() || {};
    }

    // Build stats
    const stats = {
      conversationsThisMonth: conversations.length,
      eventsThisMonth: events.length,
      averageResponseQuality: conversations.length > 0 ? 87 : 0,
      modulesActive: [
        userContext.gmail?.connected,
        userContext.googleCalendarConnected,
        userContext.inboxConnection?.connected,
      ].filter(Boolean).length,
    };

    // Generate insights
    const insights = [];

    if (conversations.length > 10) {
      insights.push({
        id: '1',
        type: 'win',
        title: 'High Engagement',
        description: `${conversations.length} conversations this month — AKAI is actively helping your business.`,
        timestamp: new Date().toISOString(),
        confidence: 0.9,
      });
    }

    if (!userContext.gmail?.connected && !userContext.inboxConnection?.connected) {
      insights.push({
        id: '2',
        type: 'opportunity',
        title: 'Connect Your Inbox',
        description: 'Email Guard is your highest-ROI module. Connecting your inbox unlocks AI proposals and auto-replies.',
        timestamp: new Date().toISOString(),
        confidence: 0.95,
      });
    }

    if (!userContext.googleCalendarConnected) {
      insights.push({
        id: '3',
        type: 'opportunity',
        title: 'Connect Calendar',
        description: 'Sophie can\'t book meetings without your calendar. Connect Google Calendar to automate appointment booking.',
        timestamp: new Date().toISOString(),
        confidence: 0.9,
      });
    }

    if (insights.length === 0) {
      insights.push({
        id: '4',
        type: 'tip',
        title: 'Ask AK Anything',
        description: 'Use the AK chat to configure campaigns, generate proposals, or get business advice.',
        timestamp: new Date().toISOString(),
        confidence: 0.8,
      });
    }

    res.json({
      insights,
      stats,
      period: 'last_30_days',
    });

  } catch (err: any) {
    console.error('[analytics/insights]', err.message);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// ── GET /api/analytics/feed/:userId ──────────────────────────────────────────
// Returns activity feed for dashboard
// Used by: Dashboard activity feed
router.get('/feed/:userId', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };

  try {
    let db: any = null; try { db = getFirebaseAdmin().firestore(); } catch { }
    if (!db) { res.json({ events: [] }); return; }

    const feedEvents: any[] = [];

    // Get recent conversations as feed items
    const conversations = await getRecentConversations(userId, 3);
    conversations.slice(0, 5).forEach(c => {
      feedEvents.push({
        id: `conv_${c.timestamp}`,
        type: 'chat',
        label: `Asked AK: "${c.userMessage?.slice(0, 60)}..."`,
        timestamp: c.timestamp,
        icon: '💬',
      });
    });

    // Get module events
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    try {
      const eventsSnap = await db.collection('users').doc(userId)
        .collection('events')
        .where('timestamp', '>=', (cutoff.toISOString() as string))
        .orderBy('timestamp' as string, 'desc' as any)
        .limit(20)
        .get();
      eventsSnap.docs.forEach((doc: any) => {
        const d = doc.data();
        feedEvents.push({
          id: doc.id,
          type: d.type || 'event',
          label: d.label || d.type || 'Activity',
          timestamp: d.timestamp,
          icon: d.icon || '⚡',
        });
      });
    } catch { /* events collection may not exist */ }

    // Sort by timestamp descending
    feedEvents.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    res.json({ events: feedEvents.slice(0, 20) });

  } catch (err: any) {
    console.error('[analytics/feed]', err.message);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// ── POST /api/analytics/event ─────────────────────────────────────────────────
// Log a user event for intelligence tracking
router.post('/event', async (req: Request, res: Response): Promise<void> => {
  const { userId, type, label, icon, metadata } = req.body;
  if (!userId || !type) { res.status(400).json({ error: 'userId and type required' }); return; }

  try {
    let db: any = null; try { db = getFirebaseAdmin().firestore(); } catch { }
    if (!db) { res.json({ ok: true }); return; }

    await db.collection('users').doc(userId).collection('events').add({
      type, label, icon, metadata,
      timestamp: new Date().toISOString(),
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
