/**
 * FIRESTORE_SCHEMA.ts — Canonical Firestore field path helpers
 *
 * ALL frontend reads of Firestore connection state must use these helpers.
 * Never hardcode field paths. See /FIRESTORE_SCHEMA.md for the full contract.
 *
 * DB name: 'akai' (not the default Firestore instance)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserDoc = Record<string, any>;

/** True when Gmail (Email Guard) is connected */
export function isGmailConnected(data: UserDoc): boolean {
  return data?.gmail?.connected === true || !!data?.gmail?.accessToken;
}

/** Gmail address on file */
export function gmailEmail(data: UserDoc): string {
  return data?.gmail?.email || '';
}

/** True when Microsoft/Outlook (Email Guard) is connected */
export function isMicrosoftConnected(data: UserDoc): boolean {
  return data?.inboxConnection?.provider === 'microsoft' || !!data?.inboxConnection?.accessTokenEnc;
}

/** Microsoft email address on file */
export function microsoftEmail(data: UserDoc): string {
  return data?.inboxConnection?.email || '';
}

/** True when Google Calendar is connected */
export function isGoogleCalendarConnected(data: UserDoc): boolean {
  return data?.googleCalendarConnected === true || !!data?.googleRefreshToken;
}

/** Google Calendar email on file */
export function googleCalendarEmail(data: UserDoc): string {
  return data?.googleCalendarEmail || '';
}

/** True when Microsoft Calendar is connected */
export function isMicrosoftCalendarConnected(data: UserDoc): boolean {
  return data?.microsoftCalendarConnected === true;
}

/** Microsoft Calendar email on file */
export function microsoftCalendarEmail(data: UserDoc): string {
  return data?.microsoftCalendarEmail || '';
}

/** True when any inbox (Gmail or MS) is connected */
export function isAnyInboxConnected(data: UserDoc): boolean {
  return isGmailConnected(data) || isMicrosoftConnected(data);
}

/** True when any calendar is connected */
export function isAnyCalendarConnected(data: UserDoc): boolean {
  return isGoogleCalendarConnected(data) || isMicrosoftCalendarConnected(data);
}

/** Business name, checking all write locations */
export function businessName(data: UserDoc): string {
  return data?.businessName || data?.campaignConfig?.businessName || data?.onboarding?.businessName || '';
}

/** Full connection summary for AK userContext */
export function buildUserContext(data: UserDoc, user: { uid: string; email: string | null; displayName: string | null }): Record<string, string> {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || data?.displayName || '',
    businessName: businessName(data),
    industry: data?.onboarding?.industry || data?.campaignConfig?.industry || '',
    location: data?.onboarding?.location || '',
    plan: data?.plan || data?.planTier || 'trial',
    gmailConnected: isGmailConnected(data) ? 'true' : 'false',
    gmailEmail: gmailEmail(data),
    microsoftConnected: isMicrosoftConnected(data) ? 'true' : 'false',
    microsoftEmail: microsoftEmail(data),
    googleCalendarConnected: isGoogleCalendarConnected(data) ? 'true' : 'false',
    googleCalendarEmail: googleCalendarEmail(data),
    microsoftCalendarConnected: isMicrosoftCalendarConnected(data) ? 'true' : 'false',
    microsoftCalendarEmail: microsoftCalendarEmail(data),
    sophieConfigured: (data?.voiceConfig?.configured === true || !!data?.campaignConfig?.businessName) ? 'true' : 'false',
  };
}
