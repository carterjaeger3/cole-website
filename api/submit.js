import { getCollection, setCollection } from '../lib/store.js';
import { makeId, readBody } from '../lib/http.js';

// Public endpoint (no admin password) for visitors to submit a prayer intention.
// Submissions go into a private "submissions" inbox that is NOT part of the
// public content feed — only Cole sees them in the admin area.
const MAX_STORED = 500; // keep the newest N so the inbox can't grow without bound

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    res.status(400).json({ error: 'Invalid request.' });
    return;
  }

  // Honeypot: bots tend to fill every field. Real users never see this one.
  // Pretend success without storing anything.
  if (body.website) {
    res.status(200).json({ ok: true });
    return;
  }

  const clip = (v, n) => (v == null ? '' : String(v).trim().slice(0, n));
  const name = clip(body.name, 100);
  const contact = clip(body.contact, 150);
  const intention = clip(body.intention, 2000);

  if (!intention) {
    res.status(400).json({ error: 'Please enter a prayer intention.' });
    return;
  }

  try {
    const list = await getCollection('submissions');
    const item = { id: makeId(), name, contact, intention, date: new Date().toISOString() };
    const next = [item, ...list].slice(0, MAX_STORED);
    await setCollection('submissions', next);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit error:', err);
    if (/not configured/i.test(err.message || '')) {
      res.status(503).json({ error: 'The site isn’t fully set up yet — please try again later.' });
      return;
    }
    res.status(500).json({ error: 'Something went wrong sending your intention.' });
  }
}
