import { Router, type Router as ExpressRouter } from 'express';
import { verifyToken } from '../../middlewares/auth';
const router: ExpressRouter = Router();

// POST /api/modules/recruit/screen — trigger AI screening call
router.post('/screen', verifyToken, async (req, res) => {
  const { phone, name, role, teamId } = req.body;
  if (!phone || !role) return res.status(400).json({ error: 'phone and role required' });

  // TODO: Integrate Bland.ai recruit screening flow
  return res.json({ success: true, message: `Screening call queued for ${name} — ${role}`, callId: 'placeholder' });
});

// GET /api/modules/recruit/candidates
router.get('/candidates', verifyToken, async (req, res) => {
  // TODO: Fetch from Firestore
  return res.json([]);
});

export default router;
