import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  businessName: string;
  industry: string;
  tone: string;
  platforms: string[];
  postsPerWeek: number;
}

interface Post {
  platform: string;
  caption: string;
  scheduledAt: string;
  status: 'scheduled';
}

interface GenerateResponse {
  posts: Post[];
  calendarUrl: string;
}

function getScheduledDate(daysFromNow: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateResponse | { error: string }>> {
  let body: GenerateRequest;

  try {
    body = await req.json() as GenerateRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { businessName, industry, tone, platforms } = body;

  if (!businessName || !industry || !tone || !platforms || platforms.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Mock response with 3 sample posts across platforms
  const posts: Post[] = [
    {
      platform: platforms.includes('instagram') ? 'instagram' : platforms[0],
      caption: `Running a ${industry} business means wearing a hundred hats. 🎩\n\nBut the best founders know which hats to hand off.\n\nAt ${businessName}, we use AI to handle the repetitive stuff — so our team stays focused on what actually moves the needle.\n\nWhat's the one task you wish you could automate today? Drop it below 👇\n\n#${industry.replace(/\s+/g, '')} #AIAutomation #BusinessGrowth #Founders`,
      scheduledAt: getScheduledDate(1, 9),
      status: 'scheduled',
    },
    {
      platform: platforms.includes('linkedin') ? 'linkedin' : platforms[0],
      caption: `3 things we learned scaling ${businessName} in the ${industry} space:\n\n1. Your brand voice is your biggest differentiator — protect it.\n2. Consistency beats virality every time. Show up daily.\n3. The businesses winning right now have AI handling their content calendar.\n\nWe went from posting twice a month to publishing daily across Instagram and LinkedIn — without adding headcount.\n\nHere's how: [link in bio]\n\n#${industry.replace(/\s+/g, '')} #ContentStrategy #GrowthHacking`,
      scheduledAt: getScheduledDate(3, 8),
      status: 'scheduled',
    },
    {
      platform: platforms.includes('instagram') ? 'instagram' : platforms[0],
      caption: `Behind the scenes at ${businessName} 👀\n\nThis is what a week of content creation used to look like:\n— 3 hours brainstorming ideas\n— 2 hours writing captions\n— 1 hour scheduling posts\n— Endless second-guessing\n\nNow? 15 minutes. AI does the rest.\n\nThe ${industry} industry is moving fast. The question is: are you keeping up?\n\n#${industry.replace(/\s+/g, '')} #BehindTheScenes #AIContent #SmallBusiness`,
      scheduledAt: getScheduledDate(5, 11),
      status: 'scheduled',
    },
  ];

  const slug = businessName.toLowerCase().replace(/\s+/g, '-');
  const response: GenerateResponse = {
    posts,
    calendarUrl: `/dashboard/social/calendar/${slug}`,
  };

  return NextResponse.json(response);
}
