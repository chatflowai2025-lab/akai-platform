'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ServiceItem {
  title: string;
  description: string;
}

interface SiteData {
  subdomain: string;
  businessName: string;
  headline: string;
  subheadline: string;
  about: string;
  services: ServiceItem[];
  cta: string;
  metaDescription: string;
  colorScheme: string;
  publishedAt: string;
}

// ── Color scheme configs ──────────────────────────────────────────────────────
const SCHEMES: Record<string, {
  bg: string;
  text: string;
  subtext: string;
  accent: string;
  accentText: string;
  card: string;
  border: string;
  navBg: string;
  footerBg: string;
}> = {
  'Modern Dark': {
    bg: '#0a0a0a',
    text: '#ffffff',
    subtext: '#9ca3af',
    accent: '#D4AF37',
    accentText: '#000000',
    card: '#111111',
    border: '#1f1f1f',
    navBg: 'rgba(10,10,10,0.95)',
    footerBg: '#080808',
  },
  'Clean Light': {
    bg: '#ffffff',
    text: '#111827',
    subtext: '#6b7280',
    accent: '#2563eb',
    accentText: '#ffffff',
    card: '#f9fafb',
    border: '#e5e7eb',
    navBg: 'rgba(255,255,255,0.95)',
    footerBg: '#f3f4f6',
  },
  'Bold & Bright': {
    bg: '#4c1d95',
    text: '#ffffff',
    subtext: '#c4b5fd',
    accent: '#facc15',
    accentText: '#000000',
    card: '#5b21b6',
    border: '#6d28d9',
    navBg: 'rgba(76,29,149,0.95)',
    footerBg: '#3b0764',
  },
  'Natural/Earthy': {
    bg: '#fafaf9',
    text: '#1c1917',
    subtext: '#78716c',
    accent: '#15803d',
    accentText: '#ffffff',
    card: '#f5f5f4',
    border: '#e7e5e4',
    navBg: 'rgba(250,250,249,0.95)',
    footerBg: '#f0fdf4',
  },
};

// ── Not Found Page ────────────────────────────────────────────────────────────
function NotFoundPage({ subdomain }: { subdomain: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🌐</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>
        Site not found
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '0.5rem', maxWidth: 400 }}>
        <strong style={{ color: '#D4AF37' }}>{subdomain}.getakai.ai</strong> doesn&apos;t exist yet.
      </p>
      <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: 400 }}>
        Build your own AI-powered website — live in minutes.
      </p>
      <a
        href="https://getakai.ai"
        style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          background: '#D4AF37',
          color: '#000',
          borderRadius: '0.75rem',
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: '0.9rem',
        }}
      >
        Build yours at getakai.ai →
      </a>
    </div>
  );
}

// ── Published Site Renderer ───────────────────────────────────────────────────
function SiteRenderer({ site }: { site: SiteData }) {
  const DEFAULT_SCHEME = { bg: '#0a0a0a', text: '#ffffff', subtext: '#9ca3af', accent: '#D4AF37', accentText: '#000000', card: '#111111', border: '#1f1f1f', navBg: 'rgba(10,10,10,0.95)', footerBg: '#080808' };
  const scheme = SCHEMES[site.colorScheme] ?? SCHEMES['Modern Dark'] ?? DEFAULT_SCHEME;
  const icons = ['⚡', '🎯', '✅', '🚀', '💡', '🔥'];

  return (
    <div style={{
      minHeight: '100vh',
      background: scheme.bg,
      color: scheme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* NAV */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '1rem 2rem',
        background: scheme.navBg,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${scheme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: scheme.text }}>
          {site.businessName}
        </span>
        <a
          href={`mailto:?subject=Enquiry — ${site.businessName}`}
          style={{
            padding: '0.5rem 1.25rem',
            background: scheme.accent,
            color: scheme.accentText,
            borderRadius: '0.5rem',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          {site.cta}
        </a>
      </nav>

      {/* HERO */}
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '5rem',
        paddingLeft: '2rem',
        paddingRight: '2rem',
        maxWidth: 900,
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          background: `${scheme.accent}22`,
          border: `1px solid ${scheme.accent}44`,
          borderRadius: '9999px',
          color: scheme.accent,
          fontSize: '0.75rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {site.businessName}
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          color: scheme.text,
        }}>
          {site.headline}
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: scheme.subtext,
          maxWidth: 600,
          margin: '0 auto 2.5rem',
          lineHeight: 1.7,
        }}>
          {site.subheadline}
        </p>
        <a
          href="#contact"
          style={{
            display: 'inline-block',
            padding: '0.875rem 2.5rem',
            background: scheme.accent,
            color: scheme.accentText,
            borderRadius: '0.75rem',
            fontWeight: 800,
            textDecoration: 'none',
            fontSize: '1rem',
          }}
        >
          {site.cta} →
        </a>
      </section>

      {/* SERVICES */}
      {site.services.length > 0 && (
        <section style={{
          padding: '4rem 2rem',
          background: scheme.card,
          borderTop: `1px solid ${scheme.border}`,
          borderBottom: `1px solid ${scheme.border}`,
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <p style={{
              fontSize: '0.75rem',
              color: scheme.subtext,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              marginBottom: '2.5rem',
              textAlign: 'center',
            }}>
              What We Do
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}>
              {site.services.map((svc, i) => (
                <div key={i} style={{
                  background: scheme.bg,
                  border: `1px solid ${scheme.border}`,
                  borderRadius: '1rem',
                  padding: '1.5rem',
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '0.5rem',
                    background: `${scheme.accent}1a`,
                    border: `1px solid ${scheme.accent}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    marginBottom: '1rem',
                  }}>
                    {icons[i % icons.length]}
                  </div>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: scheme.text }}>
                    {svc.title}
                  </h3>
                  {svc.description && (
                    <p style={{ color: scheme.subtext, fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {svc.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ABOUT */}
      {site.about && (
        <section style={{ padding: '5rem 2rem' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <p style={{
              fontSize: '0.75rem',
              color: scheme.subtext,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}>
              About Us
            </p>
            {site.about.split('\n\n').map((para, i) => (
              <p key={i} style={{
                color: scheme.subtext,
                lineHeight: 1.8,
                marginBottom: '1rem',
                fontSize: '1rem',
              }}>
                {para}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT / CTA BANNER */}
      <section id="contact" style={{
        padding: '5rem 2rem',
        background: scheme.card,
        borderTop: `1px solid ${scheme.border}`,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', color: scheme.text }}>
            Ready to get started?
          </h2>
          <p style={{ color: scheme.subtext, marginBottom: '2rem', lineHeight: 1.7 }}>
            Let&apos;s talk about how we can help your business grow.
          </p>
          <a
            href={`mailto:?subject=Enquiry — ${site.businessName}`}
            style={{
              display: 'inline-block',
              padding: '0.875rem 2.5rem',
              background: scheme.accent,
              color: scheme.accentText,
              borderRadius: '0.75rem',
              fontWeight: 800,
              textDecoration: 'none',
              fontSize: '1rem',
            }}
          >
            {site.cta}
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '2rem',
        background: scheme.footerBg,
        borderTop: `1px solid ${scheme.border}`,
        textAlign: 'center',
      }}>
        <p style={{ color: scheme.subtext, fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} {site.businessName}. Built with{' '}
          <a href="https://getakai.ai" style={{ color: scheme.accent, textDecoration: 'none' }}>
            AKAI
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────
export default function SitePage() {
  const params = useParams();
  const subdomain = typeof params.subdomain === 'string' ? params.subdomain : '';

  const [site, setSite] = useState<SiteData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subdomain) return;

    fetch(`/api/web/site/${subdomain}`)
      .then(async res => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SiteData;
        setSite(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [subdomain]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #D4AF37',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !site) {
    return <NotFoundPage subdomain={subdomain} />;
  }

  return <SiteRenderer site={site} />;
}
