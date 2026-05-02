// Instagram Graph API exposes mentions only for Business / Creator accounts
// you own, via /{ig-user-id}/tags (posts you are tagged in) and the Mentions
// webhook for @-mentions in captions/comments.
// Docs: https://developers.facebook.com/docs/instagram-platform/mentions

const API = 'https://graph.facebook.com/v19.0';

export async function fetchInstagram({ limit, instagramConfig }) {
  const { accessToken, userId } = instagramConfig;
  if (!accessToken || !userId) return [];

  const url = new URL(`${API}/${userId}/tags`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count',
  );

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Instagram fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.data || []).map((m) => ({
    id: `instagram:${m.id}`,
    platform: 'instagram',
    author: {
      name: m.username || '',
      handle: m.username ? `@${m.username}` : '',
      avatar: null,
    },
    text: m.caption || '',
    url: m.permalink || null,
    mediaUrl: m.media_url || null,
    createdAt: m.timestamp || null,
    metrics: {
      likes: m.like_count ?? 0,
      replies: m.comments_count ?? 0,
    },
  }));
}
