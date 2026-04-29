import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://be59601cf435375df9064c514e32b1c5@o4511301474713600.ingest.us.sentry.io/4511302907658240",
  
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
