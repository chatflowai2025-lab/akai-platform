// Sophie — Bland.ai voice calling integration for AKAI Sales

const BLAND_API_KEY = process.env.BLAND_API_KEY || '';
const BLAND_BASE = 'https://api.bland.ai/v1';
export const SOPHIE_VOICE = '857ed371-9b28-4006-99da-a28c41c6fa55';

interface CallOptions {
  phone: string;
  name: string;
  businessName: string;
  pitch?: string;
  teamId: string;
}

export async function triggerSophieCall(opts: CallOptions): Promise<{ callId: string }> {
  const { phone, name, businessName, pitch, teamId } = opts;

  const task = `You are Sophie, an AI sales assistant working on behalf of ${businessName}.
You are calling ${name} who has been identified as a potential customer.

Your goal: qualify their interest and book a meeting/appointment.

Be warm, natural, professional. Listen carefully. Match their energy.
If they say "pineapple", switch to feedback mode immediately.

Context: ${pitch || 'Introduce the business and ask if they have a need for the service.'}`;

  const response = await fetch(`${BLAND_BASE}/calls`, {
    method: 'POST',
    headers: {
      authorization: BLAND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: phone,
      task,
      first_sentence: `Hey, is that ${name}?`,
      model: 'turbo',
      voice: SOPHIE_VOICE,
      language: 'en-AU',
      wait_for_greeting: true,
      local_dialing: false,
      ignore_dnc: false,
      interruption_threshold: 100,
      record: true,
      metadata: { teamId, source: 'akai_sales', prospect_name: name },
    }),
  });

  const data: any = await response.json();

  if (data.status !== 'success') {
    throw new Error(data.message || 'Bland.ai call failed');
  }

  return { callId: data.call_id };
}

export async function getCallDetails(callId: string) {
  const r = await fetch(`${BLAND_BASE}/calls/${callId}`, {
    headers: { authorization: BLAND_API_KEY },
  });
  return r.json();
}

export async function getRecentCalls(limit = 50) {
  const r = await fetch(`${BLAND_BASE}/calls?limit=${limit}`, {
    headers: { authorization: BLAND_API_KEY },
  });
  const data: any = await r.json();
  return data.calls || [];
}
