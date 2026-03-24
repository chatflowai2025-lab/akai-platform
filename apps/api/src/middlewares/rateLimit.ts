import { rateLimit } from 'express-rate-limit';

// Strict limiter for sensitive endpoints (calls, AI)
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Rate limit exceeded — max 10 requests per minute for this endpoint' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat limiter
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Chat rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});
