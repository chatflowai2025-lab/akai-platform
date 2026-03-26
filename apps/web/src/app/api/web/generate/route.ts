import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// AKAI Web — Generate endpoint
// POST /api/web/generate
// Accepts: { businessName, industry, description, goals }
// Returns: { websiteUrl, status, eta }
// NOTE: Real generation is future work — this returns a mock response.
// ---------------------------------------------------------------------------

interface GenerateRequest {
  businessName: string;
  industry: string;
  description: string;
  goals: string;
}

interface GenerateResponse {
  websiteUrl: string;
  status: 'generating';
  eta: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateResponse | { error: string }>> {
  try {
    const body: GenerateRequest = await req.json();
    const { businessName, industry, description, goals } = body;

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 1) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
    }
    if (!industry || typeof industry !== 'string') {
      return NextResponse.json({ error: 'industry is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }
    if (!goals || typeof goals !== 'string') {
      return NextResponse.json({ error: 'goals is required' }, { status: 400 });
    }

    const slug = slugify(businessName.trim());

    // Mock response — real generation is future work
    const response: GenerateResponse = {
      websiteUrl: `https://${slug}.getakai.ai`,
      status: 'generating',
      eta: '2 minutes',
    };

    return NextResponse.json(response, { status: 202 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[/api/web/generate]', message);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
