import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://be59601cf435375df9064c514e32b1c5@o4511301474713600.ingest.us.sentry.io/4511302907658240",
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Only capture errors in production
  enabled: process.env.NODE_ENV === "production",
  
  // Filter out common noise
  ignoreErrors: [
    "ResizeObserver loop",
    "Network request failed",
    "Load failed",
    "ChunkLoadError",
  ],
});
