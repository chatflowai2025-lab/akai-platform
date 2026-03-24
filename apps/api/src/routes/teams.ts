import { Router } from 'express';
import { verifyToken } from '../middlewares/auth';
const router = Router();

// GET /api/teams/:teamId
router.get('/:teamId', verifyToken, async (req, res) => {
  const { teamId } = req.params;
  // TODO: Fetch from Firestore
  return res.json({ id: teamId, name: 'My Business', plan: 'starter' });
});

// PATCH /api/teams/:teamId
router.patch('/:teamId', verifyToken, async (req, res) => {
  const { teamId } = req.params;
  const updates = req.body;
  // TODO: Update in Firestore
  return res.json({ success: true, id: teamId, ...updates });
});

// POST /api/teams/:teamId/invite
router.post('/:teamId/invite', verifyToken, async (req, res) => {
  const { teamId } = req.params;
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  // TODO: Create invite token and send email
  console.log(`[Invite] ${email} → team ${teamId} as ${role}`);
  return res.json({ success: true, message: `Invite sent to ${email}` });
});

// GET /api/teams/:teamId/members
router.get('/:teamId/members', verifyToken, async (req, res) => {
  const { teamId } = req.params;
  // TODO: Fetch from Firestore
  return res.json([]);
});

export default router;
