import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface ScreenRequest {
  jobTitle: string;
  industry?: string;
  candidateName?: string;
  resumeSummary?: string;
  resumeText?: string;
  candidateExperience?: string;
  requirements?: string[];
  jobDescription?: string;
}

interface ScreenResponse {
  score: number;
  recommendation: 'advance' | 'review' | 'reject';
  reasons: string[];
  strengths: string[];
  gaps: string[];
  nextStep: string;
}

// ── Algorithmic fallback (no AI) ──────────────────────────────────────────────
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
  const base = Math.round(40 + matchRatio * 55);
  return Math.min(95, Math.max(40, base));
}

function buildReasons(resumeSummary: string, requirements: string[], score: number): string[] {
  const summary = resumeSummary.toLowerCase();
  const reasons: string[] = [];
  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of requirements) {
    const keywords = req.toLowerCase().split(/\s+/);
    const hit = keywords.some((kw) => kw.length > 3 && summary.includes(kw));
    if (hit) matched.push(req);
    else missing.push(req);
  }

  if (matched.length > 0) reasons.push(`Matched requirements: ${matched.slice(0, 3).join(', ')}`);
  if (missing.length > 0) reasons.push(`Missing or unclear: ${missing.slice(0, 2).join(', ')}`);

  if (score >= 85) reasons.push('Strong overall profile — recommend fast-tracking');
  else if (score >= 65) reasons.push('Solid candidate — worth a deeper screening call');
  else reasons.push('Limited match against core requirements');

  return reasons;
}

export async function POST(request: NextRequest): Promise<NextResponse<ScreenResponse | { error: string }>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    jobTitle,
    industry,
    candidateName,
    resumeSummary,
    resumeText,
    candidateExperience,
    requirements,
    jobDescription,
  } = body as Partial<ScreenRequest>;

  if (!jobTitle) {
    return NextResponse.json({ error: 'Missing required field: jobTitle' }, { status: 422 });
  }

  const resumeContent = resumeText || resumeSummary || candidateExperience || '';
  if (!resumeContent) {
    return NextResponse.json(
      { error: 'Missing resume content: provide resumeText or resumeSummary' },
      { status: 422 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── AI screening (Anthropic) ───────────────────────────────────────────────
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });

      const reqBlock =
        requirements && Array.isArray(requirements) && requirements.length > 0
          ? `Required Skills/Experience:\n${requirements.join('\n')}`
          : '';

      const prompt = `You are an expert HR screener. Evaluate this candidate against the job requirements.

Job Title: ${jobTitle}${industry ? `\nIndustry: ${industry}` : ''}
${jobDescription ? `\nJob Description:\n${jobDescription}` : ''}
${reqBlock}

Candidate${candidateName ? ` — ${candidateName}` : ''}:
${resumeContent}

Return ONLY valid JSON (no markdown, no explanation):
{
  "score": <integer 0-100>,
  "recommendation": "advance" | "review" | "reject",
  "strengths": ["string", "string", "string"],
  "gaps": ["string", "string"],
  "reasons": ["string", "string", "string"],
  "nextStep": "string"
}

Scoring: 80-100 = strong match (advance), 60-79 = partial match (review), 0-59 = significant gaps (reject).
Be specific — reference actual content from the resume. strengths = what they bring, gaps = what's missing.`;

      const message = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleaned) as Partial<ScreenResponse>;

      const name = candidateName || 'Candidate';
      const score = typeof result.score === 'number' ? result.score : 50;
      const recommendation: ScreenResponse['recommendation'] =
        result.recommendation === 'advance' || result.recommendation === 'review' || result.recommendation === 'reject'
          ? result.recommendation
          : score >= 80
          ? 'advance'
          : score >= 60
          ? 'review'
          : 'reject';

      const nextStep =
        result.nextStep ||
        (score >= 80
          ? `Book ${name} for a hiring manager interview within 48 hours.`
          : score >= 60
          ? `Schedule a 15-minute screening call with ${name} to clarify experience gaps.`
          : `Send ${name} a professional rejection. Keep profile in talent pipeline.`);

      return NextResponse.json({
        score,
        recommendation,
        reasons: result.reasons || [],
        strengths: result.strengths || [],
        gaps: result.gaps || [],
        nextStep,
      });
    } catch (aiErr) {
      console.error('[/api/recruit/screen] AI error, falling back to logic:', aiErr);
    }
  }

  // ── Algorithmic fallback ───────────────────────────────────────────────────
  const reqs = Array.isArray(requirements) ? requirements : [];
  const score = scoreCandidate(resumeContent, reqs);

  let recommendation: ScreenResponse['recommendation'];
  let nextStep: string;
  const name = candidateName || 'Candidate';

  if (score >= 80) {
    recommendation = 'advance';
    nextStep = `Book ${name} for a hiring manager interview within 48 hours.`;
  } else if (score >= 60) {
    recommendation = 'review';
    nextStep = `Schedule a 15-minute AI screening call with ${name} to clarify experience gaps.`;
  } else {
    recommendation = 'reject';
    nextStep = `Send ${name} a professional rejection email. Keep profile in talent pipeline for future ${industry || 'similar'} roles.`;
  }

  const reasons = buildReasons(resumeContent, reqs, score);

  return NextResponse.json({
    score,
    recommendation,
    reasons,
    strengths: reasons.filter((r) => !r.toLowerCase().includes('missing')),
    gaps: reasons.filter((r) => r.toLowerCase().includes('missing') || r.toLowerCase().includes('limited')),
    nextStep,
  });
}
