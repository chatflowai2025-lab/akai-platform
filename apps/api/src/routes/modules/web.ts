import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth';
const router = Router();

// POST /api/modules/web/generate — generate site from description
router.post('/generate', verifyToken, async (req, res) => {
  const { businessDescription, style, teamId } = req.body;
  if (!businessDescription) return res.status(400).json({ error: 'businessDescription required' });

  // TODO: GPT-4 → generate site structure + content
  return res.json({
    success: true,
    message: 'Site generation queued',
    siteId: 'placeholder',
  });
});

// GET /api/modules/web/sites
router.get('/sites', verifyToken, async (req, res) => {
  // TODO: Fetch from Firestore
  return res.json([]);
});

export default router;
