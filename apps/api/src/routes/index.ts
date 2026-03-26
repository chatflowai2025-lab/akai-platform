import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import chatRouter from './chat';
import teamsRouter from './teams';
import salesRouter from './modules/sales';
import recruitRouter from './modules/recruit';
import webRouter from './modules/web';
import calendarRouter from './calendar';

const router = Router();

router.use('/health', healthRouter);
router.use('/healthz', healthRouter); // Railway health check alias
router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/teams', teamsRouter);
router.use('/modules/sales', salesRouter);
router.use('/modules/recruit', recruitRouter);
router.use('/modules/web', webRouter);
router.use('/calendar', calendarRouter);

export default router;
