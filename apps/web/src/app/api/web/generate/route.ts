export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageType, businessName, industry, goal, description } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Write professional website copy for the ${pageType || 'Home'} page of a business called "${businessName}".
Industry: ${industry || 'professional services'}
Goal: ${goal || 'generate enquiries'}
${description ? `Description: ${description}` : ''}

Write compelling, conversion-focused copy including:
- A strong headline (10 words max)
- A subheadline (20 words max) 
- 3 key value points (one sentence each)
- A call to action (5 words max)
- 2 paragraphs of body copy

Format clearly with labels (Headline:, Subheadline:, etc.)`
        }]
      });
      const content0 = response.content[0];
      const content = content0?.type === 'text' ? content0.text : '';
      return NextResponse.json({ content });
    }

    // Fallback
    return NextResponse.json({
      content: `Headline: Transform Your ${industry || 'Business'} with ${businessName}\n\nSubheadline: Professional solutions that drive real results for your business.\n\nKey Points:\n• Expert team with proven track record\n• Tailored solutions for your specific needs\n• Fast results with ongoing support\n\nCTA: Get Started Today\n\nBody: ${businessName} is dedicated to helping businesses like yours achieve their goals. Our team brings years of expertise and a results-driven approach to every project.\n\nWhether you're looking to grow your customer base, improve efficiency, or scale your operations, we have the tools and expertise to make it happen.`
    });
  } catch (err) {
    console.error('[web/generate]', err);
    return NextResponse.json({ error: 'Generation failed — please try again.' }, { status: 500 });
  }
}
