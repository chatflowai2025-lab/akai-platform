import { MetadataRoute } from 'next';

const BASE = 'https://getakai.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

    // Module pages
    { url: `${BASE}/sales`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/voice`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/email-guard`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/recruit`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/web`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/ads`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/social`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/proposals`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/calendar`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/settings`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },

    // Legal
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
