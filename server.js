import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './src/config.js';
import { aggregateMentions } from './src/aggregator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const CACHE_TTL_MS = 60 * 1000;
let cache = { at: 0, payload: null };

app.get('/api/feed', async (req, res) => {
  try {
    const fresh = req.query.refresh === '1';
    if (!fresh && cache.payload && Date.now() - cache.at < CACHE_TTL_MS) {
      return res.json({ ...cache.payload, cached: true });
    }
    const payload = await aggregateMentions();
    cache = { at: Date.now(), payload };
    res.json({ ...payload, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(config.port, () => {
  console.log(`Socialfeed listening on http://localhost:${config.port}`);
  console.log(`Search terms: ${config.searchTerms.join(', ') || '(none configured)'}`);
});
