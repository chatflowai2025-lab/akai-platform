import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface GenerateRequest {
  brief: string;
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

function getMockPosts(brief: string): PlatformPost[] {
  return [
    {
      platform: 'Instagram',
      icon: '📸',
      content: `${brief}\n\nThis is the kind of move that changes everything. We're not just building a business — we're building a legacy. 🔥\n\nThe grind is real. The results are realer.`,
      hashtags: '#hustle #entrepreneur #business #growth #motivation #success',
      characterCount: 180,
    },
    {
      platform: 'LinkedIn',
      icon: '💼',
      content: `I've been thinking a lot about ${brief}.\n\nHere's what most people get wrong: they focus on the tactics when they should be focused on the strategy.\n\nAfter years in the industry, I've learned that consistency and authenticity win every time.\n\nWhat's your take? Drop a comment below.`,
      hashtags: '#leadership #business #strategy #growth #entrepreneurship',
      characterCount: 290,
    },
    {
      platform: 'Facebook',
      icon: '👥',
      content: `Big news! We're talking about ${brief} today and the community response has been incredible.\n\nShare this with someone who needs to hear it. Tag a friend who's been asking about this.\n\nJoin the conversation in the comments — we read every single one. 👇`,
      hashtags: '#community #business #growth',
      characterCount: 220,
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

  const { brief } = body;

  if (!brief || typeof brief !== 'string' || brief.trim().length === 0) {
    return NextResponse.json({ error: 'brief is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ posts: getMockPosts(brief) });
  }

  try {
    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a social media content expert. Generate platform-optimised posts for Instagram, LinkedIn, and Facebook based on a brief. 

Return ONLY a valid JSON object in this exact format:
{
  "instagram": {
    "content": "the post text (use emojis, be engaging, visual storytelling)",
    "hashtags": "#relevant #hashtags #here"
  },
  "linkedin": {
    "content": "the post text (professional tone, insight-driven, thought leadership)",
    "hashtags": "#professional #hashtags #here"
  },
  "facebook": {
    "content": "the post text (community-focused, conversational, encourage sharing/comments)",
    "hashtags": "#relevant #hashtags"
  }
}

Each post must be different and optimised for that platform's audience and culture. No extra text outside the JSON.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Write social media posts about: ${brief}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: {
      instagram: { content: string; hashtags: string };
      linkedin: { content: string; hashtags: string };
      facebook: { content: string; hashtags: string };
    };

    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ posts: getMockPosts(brief) });
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
    ];

    return NextResponse.json({ posts });
  } catch (err) {
    console.error('[/api/social/generate]', err);
    return NextResponse.json({ posts: getMockPosts(brief) });
  }
}
