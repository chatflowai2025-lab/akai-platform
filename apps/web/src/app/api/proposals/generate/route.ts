import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface GenerateRequest {
  businessName: string;
  contactName?: string;
  industry: string;
  location?: string;
  website?: string;
  modules: string[];
  tone: 'professional' | 'consultative' | 'direct' | 'friendly';
  existingPains?: string;
}

const MODULE_PRICES: Record<string, number> = {
  sales: 297,
  voice: 197,
  web: 197,
  social: 147,
  ads: 397,
  recruit: 247,
};

const MODULE_LABELS: Record<string, string> = {
  sales: 'Sales (Sophie AI calling)',
  voice: 'Voice (AI outbound)',
  web: 'Web (Website audit + builder)',
  social: 'Social (Content generation)',
  ads: 'Ads (Google + Meta ads)',
  recruit: 'Recruit (AI hiring)',
};

// ── Fallback template generation ──────────────────────────────────────────────
function generateFallback(body: GenerateRequest): { proposal: Record<string, unknown>; markdown: string } {
  const { businessName, contactName, industry, location, website, modules, tone } = body;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const total = modules.reduce((sum, m) => sum + (MODULE_PRICES[m] ?? 0), 0);

  const toneAdj = tone === 'friendly' ? 'warmly' : tone === 'direct' ? 'directly' : tone === 'consultative' ? 'consultatively' : 'professionally';
  void toneAdj;

  const industryPains: Record<string, string[]> = {
    default: [
      'Losing potential customers who enquire outside business hours and never hear back',
      'Sales team spending too much time on unqualified leads instead of closing',
      'No consistent follow-up process — deals fall through the cracks',
    ],
    plumbing: [
      'Missing emergency calls at night and weekends when competitors answer',
      'Estimating and quoting manually takes hours away from paid work',
      'No system to follow up on quotes that go cold',
    ],
    'real estate': [
      'Buyers and sellers expect instant responses — delayed follow-up loses listings',
      'Manually calling and qualifying hundreds of buyer enquiries every week',
      'No automated system to nurture leads until they\'re ready to transact',
    ],
    'video production': [
      'Inbound briefs arrive at all hours with no one to qualify or respond instantly',
      'No automated process to convert website visitors into booked discovery calls',
      'Client onboarding is manual — slows down production pipeline',
    ],
    recruitment: [
      'Screening hundreds of applications manually burns time better spent with clients',
      'No automated candidate sourcing — relies on manual job board searches',
      'Response times on new job orders are too slow to compete for top talent',
    ],
  };

  const industryKey = Object.keys(industryPains).find(k => industry.toLowerCase().includes(k)) || 'default';
  const challenges = industryPains[industryKey];

  const moduleDesc: Record<string, string> = {
    sales: `Sophie AI calls your ${industry} leads the moment they enquire, qualifies them in real-time, and books them straight into your calendar. No missed calls, no manual follow-up, no lost deals.`,
    voice: `AI-powered outbound dialling that works 24/7. For ${businessName}, this means every inbound enquiry gets an instant, intelligent response — day or night.`,
    web: `We audit your current website${website ? ` (${website})` : ''} for speed, SEO, and conversion issues, then rebuild or fix the top opportunities. ${industry} businesses typically see a 30–40% uplift in enquiry rate.`,
    social: `Done-for-you content for Instagram, LinkedIn, and Facebook — optimised for ${industry} audiences and posted consistently so you stay top-of-mind without lifting a finger.`,
    ads: `Google and Meta ad campaigns built with AI-written copy, targeting ${location || 'your area'} ${industry} buyers. Every dollar tracked against real leads and bookings.`,
    recruit: `AI screens every job applicant with a match score before you see them. For ${industry} hiring, this cuts time-to-hire by 60% and eliminates the resume pile.`,
  };

  const solutions = modules.map(m => ({ module: MODULE_LABELS[m] ?? m, description: moduleDesc[m] ?? `AKAI's ${m} module delivers results for ${industry} businesses.` }));

  const investmentRows = modules.map(m => `| ${MODULE_LABELS[m] ?? m} | $${MODULE_PRICES[m] ?? 0}/mo | Included |`).join('\n');

  const roi = {
    leadsPerMonth: modules.includes('sales') || modules.includes('voice') ? '15–25' : '8–12',
    avgDealSize: industry.toLowerCase().includes('plumb') ? '$800' : industry.toLowerCase().includes('real estate') ? '$12,000' : '$1,200',
    projectedRevenue: `$${(Number((modules.includes('sales') ? 20 : 10)) * 800).toLocaleString()}+`,
  };

  const proposal = {
    executiveSummary: `${businessName} is a ${industry} business${location ? ` based in ${location}` : ''} looking to grow its client pipeline and reduce manual sales work. We're proposing a ${modules.length}-module AKAI deployment that automates your outreach, follow-up, and lead qualification — so your team closes more deals with less effort.`,
    challenges,
    solutions,
    investment: { rows: modules.map(m => ({ module: MODULE_LABELS[m] ?? m, monthly: MODULE_PRICES[m] ?? 0 })), total },
    roiProjection: roi,
    nextSteps: [
      'Review this proposal and confirm the modules you want to start with',
      'Book a 30-minute onboarding call: https://calendly.com/akai/onboard',
      'Onboard and go live within 48 hours',
    ],
  };

  const markdown = `# AKAI

## PROPOSAL FOR ${businessName.toUpperCase()}
**Prepared by AKAI — ${date}**${contactName ? `\nAttention: ${contactName}` : ''}

---

## EXECUTIVE SUMMARY

${proposal.executiveSummary}

---

## THE CHALLENGE

${challenges.map(c => `- ${c}`).join('\n')}

---

## OUR SOLUTION

${solutions.map(s => `### ${s.module}\n${s.description}`).join('\n\n')}

---

## THE INVESTMENT

| Module | Monthly | Setup |
|--------|---------|-------|
${investmentRows}
| **TOTAL** | **$${total}/mo** | **$0 setup fee** |

---

## ROI PROJECTION

For ${industry} businesses, AKAI typically generates ${roi.leadsPerMonth} qualified leads per month within the first 90 days.

At an average ${industry} deal size of ${roi.avgDealSize}, capturing just 3 extra clients per month = **${roi.projectedRevenue} in additional annual revenue** — well above the cost of your AKAI subscription.

---

## NEXT STEPS

1. Review this proposal
2. Book a 30-minute call: https://calendly.com/akai/onboard
3. Onboard and launch within 48 hours

---

*AKAI — getakai.ai | hello@getakai.ai*`;

  return { proposal, markdown };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { businessName, contactName, industry, location, website, modules, tone, existingPains } = body;

    if (!businessName || !industry || !modules || modules.length === 0) {
      return NextResponse.json({ error: 'businessName, industry, and modules are required' }, { status: 400 });
    }

    const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const total = modules.reduce((sum, m) => sum + (MODULE_PRICES[m] ?? 0), 0);
    const moduleList = modules.map(m => `${MODULE_LABELS[m] ?? m} ($${MODULE_PRICES[m] ?? 0}/mo)`).join(', ');

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(generateFallback(body));
    }

    const client = new Anthropic({ apiKey });

    const toneDescriptions: Record<string, string> = {
      professional: 'formal, polished, authoritative — like a top-tier consulting firm',
      consultative: 'warm but expert — like a trusted advisor who deeply understands their business',
      direct: 'punchy and no-nonsense — every sentence earns its place, zero fluff',
      friendly: 'approachable and conversational — like a knowledgeable friend who wants them to win',
    };

    const systemPrompt = `You are AKAI's proposal writer. Generate compelling, personalised sales proposals for AKAI's AI services.

AKAI modules and pricing:
- Sales (Sophie AI calling): $297/mo
- Voice (AI outbound): $197/mo  
- Web (Website audit + builder): $197/mo
- Social (Content generation): $147/mo
- Ads (Google + Meta ads): $397/mo
- Recruit (AI hiring): $247/mo

Tone: ${toneDescriptions[tone] || toneDescriptions.professional}

Return ONLY valid JSON with this exact structure:
{
  "executiveSummary": "2-3 sentences specific to this business and industry",
  "challenges": ["challenge 1", "challenge 2", "challenge 3"],
  "solutions": [
    { "module": "module name", "description": "what it does SPECIFICALLY for this industry/business" }
  ],
  "roiProjection": {
    "leadsPerMonth": "range e.g. 15-25",
    "avgDealSize": "$X,XXX",
    "projectedRevenue": "$XX,XXX+",
    "rationale": "one sentence explanation"
  },
  "nextSteps": ["step 1", "step 2", "step 3"]
}

Rules:
- Make every sentence specific to ${industry} — no generic filler
- Challenges must be real pain points ${industry} businesses face
- Solutions describe what the module does FOR THIS SPECIFIC BUSINESS, not generic features
- ROI projection uses realistic ${industry} benchmarks
- Keep it tight — executives read fast`;

    const userPrompt = `Generate a proposal for:
- Business: ${businessName}
${contactName ? `- Contact: ${contactName}` : ''}
- Industry: ${industry}
${location ? `- Location: ${location}` : ''}
${website ? `- Website: ${website}` : ''}
- Selected modules: ${moduleList}
- Total investment: $${total}/mo
${existingPains ? `- Known pain points: ${existingPains}` : ''}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: {
      executiveSummary: string;
      challenges: string[];
      solutions: Array<{ module: string; description: string }>;
      roiProjection: { leadsPerMonth: string; avgDealSize: string; projectedRevenue: string; rationale: string };
      nextSteps: string[];
    };

    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Claude didn't return valid JSON — fall back to template
      return NextResponse.json(generateFallback(body));
    }

    // Build investment table
    const investmentRows = modules.map(m => `| ${MODULE_LABELS[m] ?? m} | $${MODULE_PRICES[m] ?? 0}/mo | Included |`).join('\n');

    const markdown = `# AKAI

## PROPOSAL FOR ${businessName.toUpperCase()}
**Prepared by AKAI — ${date}**${contactName ? `\nAttention: ${contactName}` : ''}

---

## EXECUTIVE SUMMARY

${parsed.executiveSummary}

---

## THE CHALLENGE

${parsed.challenges.map((c: string) => `- ${c}`).join('\n')}

---

## OUR SOLUTION

${parsed.solutions.map((s: { module: string; description: string }) => `### ${s.module}\n${s.description}`).join('\n\n')}

---

## THE INVESTMENT

| Module | Monthly | Setup |
|--------|---------|-------|
${investmentRows}
| **TOTAL** | **$${total}/mo** | **$0 setup fee** |

---

## ROI PROJECTION

${parsed.roiProjection.rationale}

At an average ${industry} deal size of ${parsed.roiProjection.avgDealSize}, capturing just ${parsed.roiProjection.leadsPerMonth} extra leads per month = **${parsed.roiProjection.projectedRevenue} in additional revenue**.

---

## NEXT STEPS

${parsed.nextSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

---

*AKAI — getakai.ai | hello@getakai.ai*`;

    const proposal = {
      executiveSummary: parsed.executiveSummary,
      challenges: parsed.challenges,
      solutions: parsed.solutions,
      investment: {
        rows: modules.map(m => ({ module: MODULE_LABELS[m] ?? m, monthly: MODULE_PRICES[m] ?? 0 })),
        total,
      },
      roiProjection: parsed.roiProjection,
      nextSteps: parsed.nextSteps,
    };

    return NextResponse.json({ proposal, markdown });
  } catch (err: unknown) {
    console.error('[/api/proposals/generate]', err);
    return NextResponse.json({ error: 'Failed to generate proposal' }, { status: 500 });
  }
}
