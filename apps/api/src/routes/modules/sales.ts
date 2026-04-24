import { Router, type Router as ExpressRouter } from 'express';
import { verifyToken } from '../../middlewares/auth';
const router: ExpressRouter = Router();

const BLAND_API_KEY = process.env.BLAND_API_KEY || '';
const SOPHIE_VOICE = 'amelia';

// POST /api/modules/sales/call — trigger Sophie to call a lead
router.post('/call', verifyToken, async (req, res) => {
  const { phone, name, businessContext, teamId } = req.body;
  if (!phone || !businessContext) {
    return res.status(400).json({ error: 'phone and businessContext required' });
  }

  const task = `You are Sophie, an AI sales assistant working on behalf of ${businessContext.businessName}.
You are calling ${name} who has been identified as a potential customer.

Your goal: qualify their interest and book a meeting/appointment.

Be warm, natural, professional. Listen carefully. Match their energy.
If they say "pineapple", switch to feedback mode immediately.

Context: ${businessContext.pitch || 'Introduce the business and ask if they have a need for the service.'}`;

  try {
    const res2 = await fetch('https://api.bland.ai/v1/calls', {
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
        metadata: {
          teamId,
          source: 'akai_sales',
          prospect_name: name,
        },
      }),
    });

    const data: any = await res2.json();

    if (data.status === 'success') {
      return res.json({ success: true, callId: data.call_id });
    }
    return res.status(400).json({ error: data.message || 'Call failed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/modules/sales/calls — recent calls
router.get('/calls', verifyToken, async (req, res) => {
  try {
    const r = await fetch('https://api.bland.ai/v1/calls?limit=50', {
      headers: { authorization: BLAND_API_KEY },
    });
    const data: any = await r.json();
    return res.json(data.calls || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/modules/sales/calls/:callId — call details
router.get('/calls/:callId', verifyToken, async (req, res) => {
  const { callId } = req.params;
  try {
    const r = await fetch(`https://api.bland.ai/v1/calls/${callId}`, {
      headers: { authorization: BLAND_API_KEY },
    });
    const data: any = await r.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
