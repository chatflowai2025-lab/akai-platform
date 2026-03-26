import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = 'aiclozr_api_key_2026_prod';
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'akai-platform';

interface ServiceItem {
  title: string;
  description: string;
}

interface SiteData {
  headline?: string;
  subheadline?: string;
  about?: string;
  services?: ServiceItem[];
  cta?: string;
  metaDescription?: string;
  businessName?: string;
  colorScheme?: string;
  subdomain?: string;
}

interface PublishBody {
  subdomain: string;
  userId: string;
  site: SiteData;
}

// ── Firestore REST fallback ───────────────────────────────────────────────────
async function saveViaRestApi(subdomain: string, payload: Record<string, unknown>): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/publishedSites/${subdomain}`;

  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = { integerValue: String(v) };
    } else if (v instanceof Date) {
      fields[k] = { timestampValue: v.toISOString() };
    } else {
      fields[k] = { stringValue: JSON.stringify(v) };
    }
  }

  const res = await fetch(`${url}?updateMask.fieldPaths=${Object.keys(fields).join('&updateMask.fieldPaths=')}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST failed: ${res.status} ${text}`);
  }
}

// ── POST /api/web/publish ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PublishBody;
    const { subdomain, userId, site } = body;

    if (!subdomain?.trim()) {
      return NextResponse.json({ error: 'subdomain is required' }, { status: 400 });
    }
    if (!userId?.trim()) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const payload = {
      subdomain,
      userId,
      headline: site.headline ?? '',
      subheadline: site.subheadline ?? '',
      about: site.about ?? '',
      services: JSON.stringify(site.services ?? []),
      cta: site.cta ?? '',
      metaDescription: site.metaDescription ?? '',
      businessName: site.businessName ?? '',
      colorScheme: site.colorScheme ?? 'Modern Dark',
      publishedAt: new Date().toISOString(),
      active: true,
    };

    // ── 1. Save to Firestore (Admin SDK preferred, REST fallback) ─────────────
    const db = getAdminFirestore();
    if (db) {
      await db.collection('publishedSites').doc(subdomain).set(payload, { merge: true });
    } else {
      // Fall back to REST (no service account creds in env)
      await saveViaRestApi(subdomain, payload);
    }

    // ── 2. Save to Railway (non-fatal) ────────────────────────────────────────
    try {
      const railwayRes = await fetch(`${RAILWAY_API}/api/sites/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': RAILWAY_API_KEY,
        },
        body: JSON.stringify({ subdomain, userId, site }),
        signal: AbortSignal.timeout(8000),
      });
      if (!railwayRes.ok && railwayRes.status !== 404) {
        console.warn(`[web/publish] Railway returned ${railwayRes.status} — continuing`);
      }
    } catch (railwayErr) {
      console.warn('[web/publish] Railway save failed (non-fatal):', railwayErr);
    }

    return NextResponse.json({ ok: true, url: `https://${subdomain}.getakai.ai` });
  } catch (err) {
    console.error('[web/publish]', err);
    return NextResponse.json({ error: 'Publish failed — please try again.' }, { status: 500 });
  }
}
