export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface GenerateRequest {
  brief: string;
  tone?: string;
  platforms?: string[];
}

interface PlatformPost {
  platform: string;
  icon: string;
  content: string;
  hashtags: string;
  characterCount: number;
}

interface GenerateResponse {
  posts: PlatformPost[];
}

const TONE_GUIDES: Record<string, string> = {
  Professional: 'authoritative, polished, data-driven, thought leadership style',
  Casual: 'friendly, conversational, relatable, like texting a smart friend',
  Funny: 'witty, humorous, punchy — make people laugh while delivering the message',
  Inspirational: 'motivational, uplifting, story-driven — stir emotion and move people to act',
};

function getMockPosts(brief: string, tone = 'Professional'): PlatformPost[] {
  const toneNote = tone === 'Funny' ? '😂 ' : tone === 'Inspirational' ? '💡 ' : tone === 'Casual' ? '👋 ' : '';
  void toneNote;

  const x =
    tone === 'Funny'
      ? `me: i don't need ${brief}\nalso me: *completely obsessed with ${brief}*\n\nthe pipeline was already full 💀`
      : tone === 'Inspirational'
      ? `${brief} isn't a shortcut. It's a system.\n\nBuild the system. The results follow.`
      : tone === 'Casual'
      ? `ngl ${brief} actually slaps\n\nwhy didn't anyone tell me sooner`
      : `${brief} is the move right now.\n\nIf you're not paying attention, you're falling behind.`;

  const instagram =
    tone === 'Funny'
      ? `POV: You just discovered ${brief} and now you can't imagine life before it. 😅\n\nThis is the glow-up nobody warned you about. Buckle up.\n\n(Swipe if you're ready to never go back 👉)`
      : tone === 'Inspirational'
      ? `The moment everything changes is closer than you think.\n\n${brief} — this is what we've been building toward.\n\nEvery big result started with one decision. This is yours. 🔥`
      : tone === 'Casual'
      ? `ok so ${brief} 👇\n\nAnd honestly? I'm not sure why we didn't do this sooner.\n\nDrop a 🙋 if you needed to hear this today.`
      : `${toneNote}${brief}\n\nThe data is clear. The results speak for themselves.\n\nThis is how modern businesses win. Are you in? 🚀`;

  const linkedin =
    tone === 'Funny'
      ? `Hot take: ${brief} is the cheat code everyone pretends doesn't exist.\n\nI tried it. The results were embarrassing. (In the best way.)\n\nDon't @ me — just try it yourself.\n\nWhat's your experience been?`
      : tone === 'Inspirational'
      ? `Three years ago, I was stuck.\n\nThen I stopped overthinking ${brief} and just started.\n\nHere's what I learned: the gap between where you are and where you want to be isn't skill — it's momentum.\n\nStart small. Start today. The compound effect handles the rest.\n\nWhat's one thing you've been putting off?`
      : tone === 'Casual'
      ? `Real talk — ${brief} changed how I approach everything.\n\nNot in a "thought leader" way. In a "oh wow, that actually works" way.\n\nAnyone else finding this? Drop a comment, curious if I'm alone here.`
      : `After extensive work on ${brief}, here's what the data shows:\n\n→ Consistency beats intensity every time\n→ The best systems are the ones you actually use\n→ Results compound when you stay patient\n\nWhat's your framework? I read every comment.`;

  const facebook =
    tone === 'Funny'
      ? `We need to talk about ${brief}. 😅\n\nI showed this to my team and their reaction was... a lot.\n\nTag someone who needs to see this before Monday. Trust me.`
      : tone === 'Inspirational'
      ? `This is for everyone who's been quietly working on something big.\n\n${brief} is proof that consistent effort — even when no one's watching — compounds into something extraordinary.\n\nShare this with someone who needs the reminder today. 💛`
      : tone === 'Casual'
      ? `Alright, spilling everything about ${brief} because you asked.\n\nHonestly it's simpler than it looks. And yes, it works.\n\nComment below if you want the full breakdown — I'll share everything.`
      : `Today we're diving into ${brief}.\n\nThe community response has been incredible — thank you to everyone who's shared their experience.\n\nJoin the conversation below and let us know how this applies to your business. 👇`;

  const hashtagSets: Record<string, string> = {
    Professional: '#leadership #business #strategy #growth #entrepreneurship',
    Casual: '#realtalk #entrepreneur #business #growth #vibes',
    Funny: '#businesshumor #entrepreneur #startuplife #relatable #growth',
    Inspirational: '#motivation #entrepreneurship #mindset #growth #success',
  };

  const tiktok =
    tone === 'Funny'
      ? `🎵 HOOK (0-3s): "POV: You finally tried ${brief} and now you can't go back"

SCRIPT:
• [3-8s] Show the before — the old way, the struggle
• [8-20s] The moment everything changed (use text overlay)
• [20-35s] Results — make it visual, make it real
• [35-45s] "Tell me you've done this without telling me" moment

CALL TO ACTION: Drop a 🔥 if this hits. Part 2 coming if this blows up 👇

CAPTION: okay but why did no one tell me about ${brief} sooner 😭`
      : tone === 'Inspirational'
      ? `🎵 HOOK (0-3s): "The thing nobody tells you about ${brief}..."

SCRIPT:
• [3-8s] Set the scene — make them feel the struggle
• [8-20s] The turning point — one decision changed everything
• [20-40s] The transformation — specific, visual, emotional
• [40-55s] The lesson wrapped in a story

CALL TO ACTION: Save this for when you need it. Share with someone who needs to hear this today 💛

CAPTION: This is for everyone quietly doing the work. ${brief} — the game changer nobody talks about.`
      : tone === 'Casual'
      ? `🎵 HOOK (0-3s): "Wait, does ${brief} actually work? I tested it so you don't have to"

SCRIPT:
• [3-10s] Set up the experiment — be relatable, be real
• [10-25s] The process — quick cuts, keep it moving
• [25-40s] The results — no filter, honest reaction
• [40-55s] Would I do it again? (spoiler: yes)

CALL TO ACTION: Comment your experience below 👇 obsessed with this community

CAPTION: tested ${brief} for 30 days. here's what actually happened (not sponsored, just obsessed)`
      : `🎵 HOOK (0-3s): "Here's the ${brief} strategy that's changing the game in 2024"

SCRIPT:
• [3-8s] The problem most people ignore (stat or bold claim)
• [8-20s] Step 1 — the insight that shifts everything
• [20-35s] Step 2 — the practical move (text overlays + visuals)
• [35-50s] Step 3 — the compound effect
• [50-60s] Results you can expect

CALL TO ACTION: Follow for more — new strategy every week. Save this for your team meeting.

CAPTION: The ${brief} playbook that actually works. Bookmark this.`;

  return [
    {
      platform: 'Instagram',
      icon: '📸',
      content: instagram,
      hashtags: hashtagSets[tone] ?? hashtagSets['Professional'] ?? '',
      characterCount: instagram.length,
    },
    {
      platform: 'LinkedIn',
      icon: '💼',
      content: linkedin,
      hashtags: '#leadership #business #strategy #growth',
      characterCount: linkedin.length,
    },
    {
      platform: 'Facebook',
      icon: '👥',
      content: facebook,
      hashtags: '#community #business #growth',
      characterCount: facebook.length,
    },
    {
      platform: 'X',
      icon: '𝕏',
      content: x,
      hashtags: '',
      characterCount: x.length,
    },
    {
      platform: 'TikTok',
      icon: '🎵',
      content: tiktok,
      hashtags: '#fyp #foryou #foryoupage #viral #business',
      characterCount: tiktok.length,
    },
  ];
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateResponse | { error: string }>> {
  let body: GenerateRequest;

  try {
    body = await req.json() as GenerateRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { brief, tone = 'Professional' } = body;

  if (!brief || typeof brief !== 'string' || brief.trim().length === 0) {
    return NextResponse.json({ error: 'brief is required' }, { status: 400 });
  }

  const toneGuide = TONE_GUIDES[tone] ?? TONE_GUIDES.Professional;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ posts: getMockPosts(brief, tone) });
  }

  try {
    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a world-class social media strategist. Generate platform-optimised posts for Instagram, LinkedIn, Facebook, X (Twitter), and TikTok.

TONE: ${tone} — ${toneGuide}

Return ONLY a valid JSON object in this exact format:
{
  "instagram": {
    "content": "the post text (use emojis, be engaging, visual storytelling, hooks in first line)",
    "hashtags": "#relevant #hashtags #here (8-12 tags)"
  },
  "linkedin": {
    "content": "the post text (professional insight, thought leadership, hook + story + CTA, no excessive emojis)",
    "hashtags": "#professional #hashtags (4-6 tags)"
  },
  "facebook": {
    "content": "the post text (community-focused, conversational, encourage sharing/comments, warm tone)",
    "hashtags": "#relevant #hashtags (3-5 tags)"
  },
  "x": {
    "content": "the tweet (MUST be under 280 characters total including any spaces — punchy, no hashtags needed, hook in first 5 words, conversational or bold)",
    "hashtags": ""
  },
  "tiktok": {
    "content": "A short-form video script (15-60 seconds). Format:\n🎵 HOOK (0-3s): [attention-grabbing opening line that stops the scroll — bold claim, question, or POV]\n\nSCRIPT:\n• [0-3s] Hook action/visual direction\n• [3-15s] Setup or problem\n• [15-35s] Core content — punchy, fast-paced, trend-aware\n• [35-55s] Payoff or reveal\n\nCALL TO ACTION: [specific CTA — comment X, save this, follow for more, duet this]\n\nCAPTION: [short punchy caption for the video, lowercase, relatable]",
    "hashtags": "#fyp #foryou #foryoupage #viral (plus 3-4 topic-specific tags)"
  }
}

Each post must be uniquely crafted for that platform's culture. Instagram is visual and punchy. LinkedIn is professional and insightful. Facebook is community and conversation. X is ultra-short, bold, and punchy. TikTok is creator-style video scripts — the hook MUST grab attention in the first 3 seconds, content should be trend-aware and energetic, always end with a strong CTA. Apply the ${tone} tone consistently. No extra text outside the JSON.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Write social media posts about: ${brief.trim()}` }],
    });

    const content0 = response.content[0];
    const text = content0?.type === 'text' ? content0.text : '';

    let parsed: {
      instagram: { content: string; hashtags: string };
      linkedin: { content: string; hashtags: string };
      facebook: { content: string; hashtags: string };
      x?: { content: string; hashtags: string };
      tiktok?: { content: string; hashtags: string };
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ posts: getMockPosts(brief, tone) });
    }

    const posts: PlatformPost[] = [
      {
        platform: 'Instagram',
        icon: '📸',
        content: parsed.instagram.content,
        hashtags: parsed.instagram.hashtags,
        characterCount: parsed.instagram.content.length,
      },
      {
        platform: 'LinkedIn',
        icon: '💼',
        content: parsed.linkedin.content,
        hashtags: parsed.linkedin.hashtags,
        characterCount: parsed.linkedin.content.length,
      },
      {
        platform: 'Facebook',
        icon: '👥',
        content: parsed.facebook.content,
        hashtags: parsed.facebook.hashtags,
        characterCount: parsed.facebook.content.length,
      },
      {
        platform: 'X',
        icon: '𝕏',
        content: parsed.x?.content ?? '',
        hashtags: '',
        characterCount: (parsed.x?.content ?? '').length,
      },
      {
        platform: 'TikTok',
        icon: '🎵',
        content: parsed.tiktok?.content ?? '',
        hashtags: parsed.tiktok?.hashtags ?? '#fyp #foryou #foryoupage #viral',
        characterCount: (parsed.tiktok?.content ?? '').length,
      },
    ];

    return NextResponse.json({ posts });
  } catch (err) {
    console.error('[/api/social/generate]', err);
    return NextResponse.json({ posts: getMockPosts(brief, tone) });
  }
}
