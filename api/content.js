import { getAll, DEFAULTS } from '../lib/store.js';

// Public, read-only endpoint. The home page fetches this to render prayers,
// books, verses, and newsletters. No password required.
//
// If storage isn't reachable yet (e.g. before Upstash Redis is provisioned, or
// during a transient outage) we fall back to the seed content so the public
// page always renders instead of showing an error.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const data = await getAll();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (err) {
    console.error('content error (serving seed fallback):', err);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(DEFAULTS);
  }
}
