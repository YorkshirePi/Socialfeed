// Bluesky mention search via the public AppView. Authentication is optional
// but recommended (avoids stricter unauthenticated rate limits).

const PUBLIC_APPVIEW = 'https://public.api.bsky.app';
const PDS = 'https://bsky.social';

let session = null;
let sessionExpiry = 0;

async function getSession({ identifier, appPassword }) {
  if (!identifier || !appPassword) return null;
  if (session && Date.now() < sessionExpiry) return session;

  const res = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: appPassword }),
  });
  if (!res.ok) throw new Error(`Bluesky auth failed: ${res.status}`);
  session = await res.json();
  sessionExpiry = Date.now() + 50 * 60 * 1000;
  return session;
}

async function searchTerm(term, limit, cfg) {
  const sess = await getSession(cfg).catch(() => null);
  const base = sess ? PDS : PUBLIC_APPVIEW;
  const url = new URL(`${base}/xrpc/app.bsky.feed.searchPosts`);
  url.searchParams.set('q', term);
  url.searchParams.set('limit', String(Math.min(limit, 100)));
  url.searchParams.set('sort', 'latest');

  const headers = {};
  if (sess) headers.authorization = `Bearer ${sess.accessJwt}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Bluesky search failed: ${res.status}`);
  const data = await res.json();
  return data.posts || [];
}

function normalize(post, term) {
  const author = post.author || {};
  const record = post.record || {};
  const handle = author.handle;
  const rkey = post.uri?.split('/').pop();
  return {
    id: post.uri,
    platform: 'bluesky',
    matchedTerm: term,
    author: {
      name: author.displayName || handle,
      handle: handle ? `@${handle}` : '',
      avatar: author.avatar || null,
    },
    text: record.text || '',
    url: handle && rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : null,
    createdAt: record.createdAt || post.indexedAt || null,
    metrics: {
      likes: post.likeCount ?? 0,
      reposts: post.repostCount ?? 0,
      replies: post.replyCount ?? 0,
    },
  };
}

export async function fetchBluesky({ terms, limit, blueskyConfig }) {
  if (!terms.length) return [];
  const results = await Promise.allSettled(
    terms.map((t) => searchTerm(t, limit, blueskyConfig)),
  );
  const seen = new Map();
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    for (const post of r.value) {
      if (!seen.has(post.uri)) seen.set(post.uri, normalize(post, terms[i]));
    }
  });
  return [...seen.values()];
}
