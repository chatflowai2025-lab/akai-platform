import { Router } from 'express';
import { verifyToken } from '../middlewares/auth';
const router = Router();

// GET /api/auth/me — get current user from Firebase token
router.get('/me', verifyToken, async (req, res) => {
  const user = (req as any).user;
  return res.json({ uid: user.uid, email: user.email, name: user.name || null });
});

// POST /api/auth/consent — record consent
router.post('/consent', verifyToken, async (req, res) => {
  const { consentType, jurisdiction } = req.body;
  const user = (req as any).user;

  // TODO: Store in Firestore
  console.log(`[Consent] ${user.email} — ${consentType} — ${jurisdiction}`);

  return res.json({ success: true });
});

export default router;
