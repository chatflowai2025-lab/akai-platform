// Simple feature flag system — gates risky changes behind flags
// Set flags in Vercel env vars: NEXT_PUBLIC_FLAG_xxx=true

export const FLAGS = {
  // Connection/state sync changes
  NEW_GMAIL_SCOPE: process.env.NEXT_PUBLIC_FLAG_NEW_GMAIL_SCOPE === 'true',
  // Agent handoff changes
  AGENT_HANDOFF_V2: process.env.NEXT_PUBLIC_FLAG_AGENT_HANDOFF_V2 === 'true',
  // UI state changes
  CALENDAR_SYNC_V2: process.env.NEXT_PUBLIC_FLAG_CALENDAR_SYNC_V2 === 'true',
} as const;

export function isEnabled(flag: keyof typeof FLAGS): boolean {
  return FLAGS[flag] === true;
}
