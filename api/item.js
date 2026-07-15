import { DETAIL_COLLECTIONS, getItem } from '../lib/store.js';

// Public, read-only endpoint backing the detail pages (/books/:id,
// /travels/:id, /newsletters/:id). No password required — same as
// /api/content, this is public site content.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { type, id } = req.query;
  if (!DETAIL_COLLECTIONS.includes(type) || !id) {
    res.status(400).json({ error: 'Invalid request.' });
    return;
  }

  try {
    const item = await getItem(type, id);
    if (!item) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, type, item });
  } catch (err) {
    console.error('item fetch error:', err);
    res.status(500).json({ error: 'Failed to load.' });
  }
}
