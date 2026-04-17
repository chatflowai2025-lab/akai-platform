export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface GenerateJDRequest {
  jobTitle: string;
  location: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  businessName?: string;
  industry?: string;
}

function buildFallbackJD(data: GenerateJDRequest): string {
  const { jobTitle, location, employmentType, salaryMin, salaryMax, description, businessName, industry } = data;
  const salary = salaryMin && salaryMax ? `$${salaryMin}–$${salaryMax} AUD` : salaryMin ? `From $${salaryMin} AUD` : 'Competitive salary';
  const company = businessName || 'Our Company';
  const ind = industry || 'our industry';

  return `# ${jobTitle}
**${company}** · ${location} · ${employmentType}

---

## About the Company

${company} is a growing, results-driven business operating in ${ind}. We're focused on building a high-performance team that delivers exceptional outcomes for our clients and customers.

---

## Role Overview

${description || `We're looking for a talented ${jobTitle} to join our team and help drive our business forward. This is an exciting opportunity to make a real impact in a fast-moving environment.`}

---

## Key Responsibilities

- Lead and execute core ${jobTitle} functions with a high standard of quality
- Collaborate with cross-functional teams to deliver business outcomes
- Identify and implement process improvements to increase efficiency
- Build and maintain strong relationships with key stakeholders
- Report on key metrics and contribute to strategic planning
- Contribute to a positive, high-performance team culture
- Stay current with industry trends and best practices

---

## What We're Looking For

- Proven experience in a ${jobTitle} or similar role
- Strong communication and stakeholder management skills
- Ability to work independently and as part of a team
- Results-driven mindset with a focus on quality
- Strong problem-solving and analytical skills

---

## What We Offer

- **Salary:** ${salary}
- **Employment type:** ${employmentType}
- **Location:** ${location}
- Supportive and collaborative team environment
- Opportunities for professional development and growth
- Flexible working arrangements where possible

---

## How to Apply

Submit your resume and a brief cover letter outlining your experience and why you're the right fit for this role. We'll be in touch within 5 business days.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateJDRequest = await req.json();
    const { jobTitle, location, employmentType, salaryMin, salaryMax, description, businessName, industry } = body;

    if (!jobTitle) {
      return NextResponse.json({ error: 'jobTitle is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ jd: buildFallbackJD(body) });
    }

    const client = new Anthropic({ apiKey });

    const salary = salaryMin && salaryMax
      ? `$${salaryMin}–$${salaryMax} AUD per annum`
      : salaryMin
      ? `From $${salaryMin} AUD per annum`
      : 'Competitive salary';

    const company = businessName || 'Our Company';
    const ind = industry || 'our industry';

    const prompt = `You are an expert HR copywriter. Write a professional, compelling job description for the following role.

Job Title: ${jobTitle}
Company: ${company}
Industry: ${ind}
Location: ${location}
Employment Type: ${employmentType}
Salary: ${salary}
Brief Description: ${description || `A ${jobTitle} role at ${company}`}

Write a complete, well-formatted job description in Markdown with these exact sections:
1. Job title as H1, then company · location · employment type on a line below
2. A horizontal rule
3. ## About the Company — 2-3 sentences about ${company} in ${ind}. Make it sound compelling and genuine.
4. ## Role Overview — 2-3 sentences based on the brief description, expanding it professionally
5. ## Key Responsibilities — 5-7 bullet points (use "- " prefix), specific to this role
6. ## What We're Looking For — 5-6 bullet points of ideal candidate requirements
7. ## What We Offer — bullet list including the salary (${salary}), employment type (${employmentType}), location (${location}), plus 3 genuinely appealing benefits
8. ## How to Apply — 2-3 sentences with a professional application process

Write in a professional but human tone. Be specific and compelling — this should attract top candidates.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const content0 = response.content[0];
    const jd = content0?.type === 'text' ? content0.text : buildFallbackJD(body);

    return NextResponse.json({ jd });
  } catch (err: unknown) {
    console.error('[/api/recruit/generate-jd]', err);
    return NextResponse.json({ error: 'Failed to generate JD' }, { status: 500 });
  }
}
