import type { Request, Response, NextFunction } from 'express';
import { getFirebaseAdmin } from '../lib/firebase';

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — Bearer token required' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    // In dev, allow bypass with x-dev-bypass header
    if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass'] === 'true') {
      (req as any).user = { uid: 'dev-user', email: 'dev@akai.ai', name: 'Dev User' };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
