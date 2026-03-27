import { Router, type Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'akai-api',
    version: process.env.npm_package_version || '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

export default router;
