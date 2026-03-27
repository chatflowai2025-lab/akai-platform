import { Router, type Router as ExpressRouter } from 'express';
import OpenAI from 'openai';
import type { OnboardingState, ChatMessage } from '@akai/shared-types';

const router: ExpressRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are MM (Money Maker), the AI business partner built into AKAI — the AI Business Operating System.

AKAI modules:
- AKAI Sales: Sophie AI calls leads, books meetings automatically
- AKAI Recruit: AI sources + screens candidates 
- AKAI Web: AI builds + manages websites via chat
- AKAI Ads: Google + Meta campaigns (coming soon)
- AKAI Social: Instagram + LinkedIn automation (coming soon)

You help businesses:
1. Onboard (understand their business, set up modules)
2. Run operations (trigger calls, review leads, manage pipeline)
3. Grow (strategy, optimisation, expansion)

Be direct, confident, and results-focused. Aaron's vibe — not corporate.
Always end with a clear next action or question.

When you want to trigger an action, include JSON at the END of your message like:
ACTION: {"type": "redirect", "url": "/dashboard"}
or
ACTION: {"type": "show_buttons", "buttons": [{"label": "Activate Sales", "action": "activate_sales", "primary": true}]}`;

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, state, messages = [], context } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  // Build conversation history
  const history: OpenAI.Chat.ChatCompletionMessageParam[] = messages
    .slice(-10) // last 10 messages for context
    .map((m: ChatMessage) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Add onboarding context if present
  let systemContext = SYSTEM_PROMPT;
  if (state) {
    systemContext += `\n\nCurrent onboarding state: ${JSON.stringify(state)}`;
  }
  if (context === 'dashboard') {
    systemContext += '\n\nContext: User is in the dashboard. They may be asking to run operations.';
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemContext },
        ...history,
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const rawResponse = completion.choices[0]?.message?.content || "I'm not sure how to help with that.";

    // Parse action if present
    let responseText = rawResponse;
    let action = null;
    let buttons = null;
    let url = null;

    const actionMatch = rawResponse.match(/ACTION:\s*({.*})/s);
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1] ?? '{}');
        action = actionData.type;
        buttons = actionData.buttons;
        url = actionData.url;
        responseText = rawResponse.replace(/ACTION:\s*{.*}/s, '').trim();
      } catch (e) {
        // Invalid JSON in action — ignore
      }
    }

    // Update onboarding state based on conversation
    let newState = state;
    if (state) {
      newState = advanceOnboarding(state, message, responseText);
    }

    return res.json({
      message: responseText,
      action,
      buttons,
      url,
      state: newState,
    });
  } catch (err: any) {
    console.error('[Chat]', err.message);
    return res.status(500).json({ error: 'Chat service unavailable' });
  }
});

function advanceOnboarding(state: OnboardingState, userMessage: string, aiResponse: string): OnboardingState {
  const s = { ...state, data: { ...state.data } };

  switch (s.step) {
    case 'business_name':
      s.data.businessName = userMessage;
      s.step = 'industry';
      break;
    case 'industry':
      s.data.industry = userMessage;
      s.step = 'goal';
      break;
    case 'goal':
      s.data.goals = [userMessage];
      s.step = 'modules';
      break;
    case 'modules':
      s.step = 'complete';
      break;
  }

  return s;
}

export default router;
