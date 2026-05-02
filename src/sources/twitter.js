// Twitter / X recent search via API v2. Requires a Bearer Token from a paid
// developer plan (Basic tier and above). Without one this source is skipped.

const ENDPOINT = 'https://api.twitter.com/2/tweets/search/recent';

function buildQuery(terms) {
  // Quote multi-word terms; OR them together; exclude retweets to reduce noise.
  const clauses = terms.map((t) => (t.includes(' ') ? `"${t}"` : t));
  return `(${clauses.join(' OR ')}) -is:retweet`;
}

export async function fetchTwitter({ terms, limit, twitterConfig }) {
  if (!twitterConfig.bearerToken || !terms.length) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set('query', buildQuery(terms));
  url.searchParams.set('max_results', String(Math.min(Math.max(limit, 10), 100)));
  url.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
  url.searchParams.set('expansions', 'author_id');
  url.searchParams.set('user.fields', 'name,username,profile_image_url');

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${twitterConfig.bearerToken}` },
  });
  if (!res.ok) throw new Error(`Twitter search failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const users = new Map((data.includes?.users || []).map((u) => [u.id, u]));

  return (data.data || []).map((t) => {
    const author = users.get(t.author_id) || {};
    return {
      id: `twitter:${t.id}`,
      platform: 'twitter',
      author: {
        name: author.name || '',
        handle: author.username ? `@${author.username}` : '',
        avatar: author.profile_image_url || null,
      },
      text: t.text,
      url: author.username ? `https://x.com/${author.username}/status/${t.id}` : null,
      createdAt: t.created_at,
      metrics: {
        likes: t.public_metrics?.like_count ?? 0,
        reposts: t.public_metrics?.retweet_count ?? 0,
        replies: t.public_metrics?.reply_count ?? 0,
      },
    };
  });
}
