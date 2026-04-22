import { Router, Request, Response, type Router as ExpressRouter } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import chatRouter from './chat';
import teamsRouter from './teams';
import salesRouter from './modules/sales';
import recruitRouter from './modules/recruit';
import webRouter from './modules/web';
import calendarRouter from './calendar';
import analyticsRouter from './analytics';

const router: ExpressRouter = Router();

router.use('/health', healthRouter);
router.use('/healthz', healthRouter); // Railway health check alias
router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/teams', teamsRouter);
router.use('/modules/sales', salesRouter);
router.use('/modules/recruit', recruitRouter);
router.use('/modules/web', webRouter);
router.use('/calendar', calendarRouter);
router.use('/analytics', analyticsRouter);

// Temporary OAuth capture — MM re-auth only. Remove after use.
router.get('/oauth-capture', (req: Request, res: Response): void => {
  const { code, error, state } = req.query as Record<string, string>;
  if (code) {
    console.log('[oauth-capture] CODE:', code);
    res.send(`<h2>✅ Auth code captured!</h2><p>Code: <code>${code}</code></p><p>Paste this back to MM in Discord.</p>`);
  } else {
    res.send(`<h2>❌ Error: ${error || 'no code'}</h2>`);
  }
});

export default router;
