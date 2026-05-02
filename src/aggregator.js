import { config } from './config.js';
import { fetchBluesky } from './sources/bluesky.js';
import { fetchTwitter } from './sources/twitter.js';
import { fetchLinkedIn } from './sources/linkedin.js';
import { fetchInstagram } from './sources/instagram.js';

const SOURCES = [
  {
    name: 'bluesky',
    enabled: () => true,
    run: () =>
      fetchBluesky({
        terms: config.searchTerms,
        limit: config.perSourceLimit,
        blueskyConfig: config.bluesky,
      }),
  },
  {
    name: 'twitter',
    enabled: () => Boolean(config.twitter.bearerToken),
    run: () =>
      fetchTwitter({
        terms: config.searchTerms,
        limit: config.perSourceLimit,
        twitterConfig: config.twitter,
      }),
  },
  {
    name: 'linkedin',
    enabled: () =>
      Boolean(config.linkedin.accessToken && config.linkedin.organizationUrn),
    run: () =>
      fetchLinkedIn({
        limit: config.perSourceLimit,
        linkedinConfig: config.linkedin,
      }),
  },
  {
    name: 'instagram',
    enabled: () =>
      Boolean(config.instagram.accessToken && config.instagram.userId),
    run: () =>
      fetchInstagram({
        limit: config.perSourceLimit,
        instagramConfig: config.instagram,
      }),
  },
];

export async function aggregateMentions() {
  const active = SOURCES.map((s) => ({
    name: s.name,
    configured: s.enabled(),
    promise: s.enabled() ? s.run() : Promise.resolve([]),
  }));

  const settled = await Promise.allSettled(active.map((s) => s.promise));

  const sources = {};
  const items = [];
  settled.forEach((r, i) => {
    const meta = active[i];
    if (r.status === 'fulfilled') {
      sources[meta.name] = {
        configured: meta.configured,
        count: r.value.length,
        error: null,
      };
      items.push(...r.value);
    } else {
      sources[meta.name] = {
        configured: meta.configured,
        count: 0,
        error: r.reason?.message || String(r.reason),
      };
    }
  });

  items.sort((a, b) => {
    const at = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bt - at;
  });

  return {
    fetchedAt: new Date().toISOString(),
    terms: config.searchTerms,
    sources,
    items,
  };
}
