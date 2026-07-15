import { addItem } from '../lib/store.js';
import { readBody } from '../lib/http.js';

// Public endpoint (no admin password) for visitors to submit a prayer intention.
// Submissions go into a private "submissions" table that is NOT part of the
// public content feed — only Cole sees them in the admin area.
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
  const anonymous = !!body.anonymous;
  const name = anonymous ? '' : clip(body.name, 100);
  const contact = anonymous ? '' : clip(body.contact, 150);
  const intention = clip(body.intention, 2000);

  if (!intention) {
    res.status(400).json({ error: 'Please enter a prayer intention.' });
    return;
  }

  try {
    await addItem('submissions', { name, contact, intention, anonymous });
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
