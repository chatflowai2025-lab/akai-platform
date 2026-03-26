import { NextRequest, NextResponse } from 'next/server';

interface ScreenRequest {
  jobTitle: string;
  industry?: string;
  candidateName: string;
  resumeSummary?: string;
  candidateExperience?: string;
  requirements?: string[];
  jobDescription?: string;
}

interface ScreenResponse {
  score: number;
  recommendation: 'advance' | 'reject' | 'review';
  reasons: string[];
  nextStep: string;
}

function scoreCandidate(resumeSummary: string, requirements: string[]): number {
  const summary = resumeSummary.toLowerCase();

  if (requirements.length === 0) return 50;

  let matched = 0;
  for (const req of requirements) {
    const keywords = req.toLowerCase().split(/\s+/);
    const hit = keywords.some((kw) => kw.length > 3 && summary.includes(kw));
    if (hit) matched++;
  }

  const matchRatio = matched / requirements.length;
  // Scale to 40–95 range to produce realistic scores
  const base = Math.round(40 + matchRatio * 55);
  return Math.min(95, Math.max(40, base));
}

function buildReasons(
  resumeSummary: string,
  requirements: string[],
  score: number,
): string[] {
  const summary = resumeSummary.toLowerCase();
  const reasons: string[] = [];

  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of requirements) {
    const keywords = req.toLowerCase().split(/\s+/);
    const hit = keywords.some((kw) => kw.length > 3 && summary.includes(kw));
    if (hit) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }

  if (matched.length > 0) {
    reasons.push(`Matched requirements: ${matched.slice(0, 3).join(', ')}`);
  }
  if (missing.length > 0) {
    reasons.push(`Missing or unclear: ${missing.slice(0, 2).join(', ')}`);
  }

  if (score >= 85) {
    reasons.push('Strong overall profile — recommend fast-tracking');
  } else if (score >= 65) {
    reasons.push('Solid candidate — worth a deeper screening call');
  } else {
    reasons.push('Limited match against core requirements');
  }

  return reasons;
}

export async function POST(request: NextRequest): Promise<NextResponse<ScreenResponse | { error: string }>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { jobTitle, industry, candidateName, resumeSummary, requirements } =
    body as Partial<ScreenRequest>;

  if (!jobTitle || !industry || !candidateName || !resumeSummary || !requirements) {
    return NextResponse.json(
      { error: 'Missing required fields: jobTitle, industry, candidateName, resumeSummary, requirements' },
      { status: 422 },
    );
  }

  if (!Array.isArray(requirements)) {
    return NextResponse.json(
      { error: 'requirements must be an array of strings' },
      { status: 422 },
    );
  }

  const score = scoreCandidate(resumeSummary, requirements);

  let recommendation: ScreenResponse['recommendation'];
  let nextStep: string;

  if (score >= 80) {
    recommendation = 'advance';
    nextStep = `Book ${candidateName} for a hiring manager interview within 48 hours.`;
  } else if (score >= 60) {
    recommendation = 'review';
    nextStep = `Schedule a 15-minute AI screening call with ${candidateName} to clarify experience gaps.`;
  } else {
    recommendation = 'reject';
    nextStep = `Send ${candidateName} a professional rejection email. Keep profile in talent pipeline for future ${industry} roles.`;
  }

  const reasons = buildReasons(resumeSummary, requirements, score);

  const response: ScreenResponse = {
    score,
    recommendation,
    reasons,
    nextStep,
  };

  return NextResponse.json(response);
}
