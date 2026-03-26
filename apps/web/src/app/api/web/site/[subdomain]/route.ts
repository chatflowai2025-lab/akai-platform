import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'akai-platform';

interface SiteRecord {
  subdomain: string;
  userId: string;
  headline: string;
  subheadline: string;
  about: string;
  services: string; // JSON-encoded array
  cta: string;
  metaDescription: string;
  businessName: string;
  colorScheme: string;
  publishedAt: string;
  active: boolean;
}

// ── Firestore REST fallback ───────────────────────────────────────────────────
async function fetchViaRestApi(subdomain: string): Promise<SiteRecord | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/publishedSites/${subdomain}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore REST ${res.status}`);

  const doc = (await res.json()) as {
    fields?: Record<string, { stringValue?: string; booleanValue?: boolean; integerValue?: string }>;
  };
  if (!doc.fields) return null;

  const f = doc.fields;
  return {
    subdomain: f.subdomain?.stringValue ?? subdomain,
    userId: f.userId?.stringValue ?? '',
    headline: f.headline?.stringValue ?? '',
    subheadline: f.subheadline?.stringValue ?? '',
    about: f.about?.stringValue ?? '',
    services: f.services?.stringValue ?? '[]',
    cta: f.cta?.stringValue ?? '',
    metaDescription: f.metaDescription?.stringValue ?? '',
    businessName: f.businessName?.stringValue ?? '',
    colorScheme: f.colorScheme?.stringValue ?? 'Modern Dark',
    publishedAt: f.publishedAt?.stringValue ?? '',
    active: f.active?.booleanValue ?? true,
  };
}

// ── GET /api/web/site/[subdomain] ─────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { subdomain: string } },
) {
  const { subdomain } = params;

  if (!subdomain?.trim()) {
    return NextResponse.json({ error: 'subdomain is required' }, { status: 400 });
  }

  try {
    let site: SiteRecord | null = null;

    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection('publishedSites').doc(subdomain).get();
      if (snap.exists) {
        site = snap.data() as SiteRecord;
      }
    } else {
      site = await fetchViaRestApi(subdomain);
    }

    if (!site || site.active === false) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Parse services if they are stored as JSON string
    let services: { title: string; description: string }[] = [];
    try {
      services = JSON.parse(site.services);
    } catch {
      services = [];
    }

    return NextResponse.json({ ...site, services });
  } catch (err) {
    console.error('[api/web/site]', err);
    return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 });
  }
}
