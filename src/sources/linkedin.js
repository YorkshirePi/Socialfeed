// LinkedIn does not expose a public post-search API. The closest equivalent is
// the Organization Mentions endpoint, which requires a Marketing Developer
// Platform partner app and only returns mentions of pages you administer.
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/organizations/notifications-api

const API = 'https://api.linkedin.com/rest';

export async function fetchLinkedIn({ limit, linkedinConfig }) {
  const { accessToken, organizationUrn } = linkedinConfig;
  if (!accessToken || !organizationUrn) return [];

  const url = new URL(`${API}/organizationalEntityNotifications`);
  url.searchParams.set('q', 'criteria');
  url.searchParams.set('actions', 'List(MENTION_IN_COMMENT,MENTION_IN_SHARE)');
  url.searchParams.set('organizationalEntity', organizationUrn);
  url.searchParams.set('count', String(limit));

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'linkedin-version': '202405',
      'x-restli-protocol-version': '2.0.0',
    },
  });
  if (!res.ok) throw new Error(`LinkedIn fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.elements || []).map((n) => ({
    id: `linkedin:${n.generatedActivity || n.id}`,
    platform: 'linkedin',
    author: {
      name: n.actor?.name?.localized?.en_US || '',
      handle: '',
      avatar: null,
    },
    text: n.generatedActivityContent?.text || n.message || '',
    url: n.generatedActivity
      ? `https://www.linkedin.com/feed/update/${n.generatedActivity}`
      : null,
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
    metrics: {},
  }));
}
