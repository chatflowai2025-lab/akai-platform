# Firestore Schema — Canonical Field Paths

**DB name:** `akai` (named database — NOT the default)

All frontend reads MUST use `firestore-schema.ts` constants. Never hardcode field paths.
All backend writes MUST update this doc first if adding new fields.

---

## `users/{uid}` — Root Document

### Identity
| Field | Type | Written by | Notes |
|---|---|---|---|
| `email` | string | Firebase Auth | user's email |
| `displayName` | string | Firebase Auth / onboarding | |
| `businessName` | string | onboarding wizard | |
| `plan` | string | Stripe webhook | 'trial' \| 'starter' \| 'growth' \| 'scale' |
| `planTier` | string | Stripe webhook | alias for plan |

### Onboarding
| Field | Type | Written by |
|---|---|---|
| `onboarding.businessName` | string | onboarding wizard |
| `onboarding.industry` | string | onboarding wizard |
| `onboarding.location` | string | onboarding wizard |

### Gmail (Email Guard)
| Field | Type | Written by | Notes |
|---|---|---|---|
| `gmail.connected` | boolean | Railway `/api/email/gmail/callback` | true when OAuth complete |
| `gmail.email` | string | Railway | user's Gmail address |
| `gmail.accessToken` | string | Railway | encrypted |
| `gmail.refreshToken` | string | Railway | encrypted |

### Microsoft / Outlook
| Field | Type | Written by | Notes |
|---|---|---|---|
| `inboxConnection.provider` | string | Railway MS OAuth | `'microsoft'` |
| `inboxConnection.email` | string | Railway | user's MS email |
| `inboxConnection.accessTokenEnc` | string | Railway | encrypted token |
| `inboxConnection.refreshTokenEnc` | string | Railway | encrypted refresh |

### Google Calendar
| Field | Type | Written by | Notes |
|---|---|---|---|
| `googleCalendarConnected` | boolean | Railway `/api/calendar/google/callback` | true when connected |
| `googleCalendarEmail` | string | Railway | user's Google email |
| `googleRefreshToken` | string | Railway | encrypted |

### Microsoft Calendar
| Field | Type | Written by | Notes |
|---|---|---|---|
| `microsoftCalendarConnected` | boolean | Railway `/api/calendar/ms/callback` | true when connected |
| `microsoftCalendarEmail` | string | Railway | user's MS email |

### Google Analytics (GA4)
| Field | Type | Written by | Notes |
|---|---|---|---|
| `ga4Connection.propertyId` | string | Next.js `/api/analytics/ga4/callback` | e.g. `"properties/123456789"` |
| `ga4Connection.propertyName` | string | Next.js callback | GA4 property display name |
| `ga4Connection.connected` | boolean | Next.js callback | true when OAuth complete |
| `ga4Connection.accessToken` | string | Next.js callback | OAuth access token (short-lived) |
| `ga4Connection.refreshToken` | string | Next.js callback | OAuth refresh token (long-lived) |
| `ga4Connection.connectedAt` | string | Next.js callback | ISO timestamp |

Detection: `data?.ga4Connection?.connected === true`

### Voice / Sophie
| Field | Type | Written by |
|---|---|---|
| `voiceConfig.*` | object | Voice settings page |
| `voiceConfig.configured` | boolean | Voice settings page |
| `campaignConfig.*` | object | Campaign config flow |

---

## Connection Detection Logic (canonical)

```ts
// Gmail connected
const gmailConnected = data?.gmail?.connected === true || !!data?.gmail?.accessToken;

// Microsoft/Outlook connected  
const msConnected = data?.inboxConnection?.provider === 'microsoft'
  || !!data?.inboxConnection?.accessTokenEnc;

// Google Calendar connected
const gcalConnected = data?.googleCalendarConnected === true || !!data?.googleRefreshToken;

// Microsoft Calendar connected
const mscalConnected = data?.microsoftCalendarConnected === true;
```

---

## Rules

1. **Never add a field without updating this doc first**
2. **Frontend reads via `firestore-schema.ts` constants only** — no raw string paths
3. **Backend (Railway) writes must match the paths above** — coordinate before adding new fields
4. **DB name is `akai`** — never use the default/unnamed Firestore instance
