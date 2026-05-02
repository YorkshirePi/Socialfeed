import 'dotenv/config';

const parseList = (s) =>
  (s || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 3000,
  searchTerms: parseList(process.env.SEARCH_TERMS),
  perSourceLimit: Number(process.env.PER_SOURCE_LIMIT) || 25,
  bluesky: {
    identifier: process.env.BLUESKY_IDENTIFIER || '',
    appPassword: process.env.BLUESKY_APP_PASSWORD || '',
  },
  twitter: {
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  },
  linkedin: {
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    organizationUrn: process.env.LINKEDIN_ORGANIZATION_URN || '',
  },
  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    userId: process.env.INSTAGRAM_USER_ID || '',
  },
};
