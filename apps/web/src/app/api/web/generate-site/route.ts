import { NextRequest, NextResponse } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40)
    .replace(/-$/, '');
}

// Lazy-init Anthropic client
let anthropicInstance: ReturnType<typeof createAnthropicClient> | null = null;

function createAnthropicClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: Anthropic } = require('@anthropic-ai/sdk') as { default: typeof import('@anthropic-ai/sdk').default };
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicInstance) anthropicInstance = createAnthropicClient();
  return anthropicInstance;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ServiceItem {
  title: string;
  description: string;
}

interface BuildResponse {
  headline: string;
  subheadline: string;
  about: string;
  services: ServiceItem[];
  cta: string;
  metaDescription: string;
  subdomain: string;
}

// ── POST /api/web/build ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      businessType?: string;
      businessName?: string;
      industry?: string;
      location?: string;
      tagline?: string;
      services?: string[] | string;
      contactEmail?: string;
      contactPhone?: string;
      colorScheme?: string;
    };

    const {
      businessType,
      businessName,
      industry,
      location,
      tagline,
      services,
      colorScheme,
    } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
    }

    const subdomain = slugify(businessName);
    const servicesArr: string[] = Array.isArray(services)
      ? services
      : services
      ? [services]
      : ['Core service', 'Expert consultation', 'Ongoing support'];

    const client = getAnthropicClient();

    if (client) {
      const prompt = `You are a professional copywriter. Generate website content for a business and return ONLY valid JSON.

Business Name: ${businessName}
Business Type: ${businessType || industry || 'professional services'}
Location: ${location || 'Australia'}
Tagline hint: ${tagline || '(generate a catchy one)'}
Key Services: ${servicesArr.join(', ')}
Colour Scheme: ${colorScheme || 'Modern Dark'}

Return this exact JSON structure:
{
  "headline": "Punchy headline, 8 words max",
  "subheadline": "Compelling subheadline, 20 words max",
  "about": "Two paragraph about section. Paragraph 1 here.\\n\\nParagraph 2 here.",
  "services": [
    {"title": "Service Name", "description": "Two sentences about this service."},
    {"title": "Service Name", "description": "Two sentences about this service."},
    {"title": "Service Name", "description": "Two sentences about this service."}
  ],
  "cta": "Call to action, 4-6 words",
  "metaDescription": "SEO meta description, 155 chars max"
}`;

      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      try {
        // Strip markdown code fences if present
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned) as Omit<BuildResponse, 'subdomain'>;
        return NextResponse.json({ ...parsed, subdomain } satisfies BuildResponse);
      } catch {
        // Fall through to fallback
        console.error('[web/build] JSON parse failed, using fallback');
      }
    }

    // ── Fallback (no API key or parse failure) ────────────────────────────────
    const typeLabel = industry || businessType || 'professional services';
    const loc = location || 'your area';

    const result: BuildResponse = {
      headline: `${businessName} — Built for Results`,
      subheadline: `Professional ${typeLabel} in ${loc} — trusted, reliable, ready to help you grow.`,
      about: `${businessName} is a trusted provider of ${typeLabel} based in ${loc}. We combine deep expertise with a personal, client-first approach to deliver outcomes that matter.\n\nOur team works closely with every client to understand their goals and exceed expectations. Whether you're just getting started or looking to scale, we're here for the journey.`,
      services: servicesArr.slice(0, 3).map((s) => ({
        title: s,
        description: `We deliver exceptional ${s.toLowerCase()} tailored to your unique needs. Our team brings proven experience and a results-focused mindset to every engagement.`,
      })),
      cta: 'Get in Touch Today',
      metaDescription: `${businessName} — professional ${typeLabel} in ${loc}. Trusted, experienced, results-driven. Contact us today.`,
      subdomain,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[web/build]', err);
    return NextResponse.json({ error: 'Build failed — please try again.' }, { status: 500 });
  }
}
