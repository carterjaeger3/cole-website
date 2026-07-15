import { COLLECTIONS, getCollection, setCollection } from '../lib/store.js';

// Insert new items at the front for everything except books, which read as a
// running reading list (oldest first).
function prepends(collection) {
  return collection !== 'books';
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function readBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

// Keep only the fields we expect for each collection, and coerce to strings so a
// malformed request can't stuff arbitrary structures into storage.
function cleanItem(collection, item) {
  const s = (v) => (v == null ? '' : String(v).trim());
  switch (collection) {
    case 'prayers':
      return { text: s(item.text), date: s(item.date) };
    case 'books':
      return { title: s(item.title), author: s(item.author), note: s(item.note) };
    case 'verses':
      return { text: s(item.text), ref: s(item.ref) };
    case 'newsletters':
      return { month: s(item.month), title: s(item.title), summary: s(item.summary), link: s(item.link) };
    default:
      return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'Server is not configured: ADMIN_PASSWORD is missing.' });
    return;
  }
  const provided = req.headers['x-admin-password'];
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    res.status(400).json({ error: 'Invalid request body.' });
    return;
  }

  const { action, collection, item, id } = body;

  // Login check: password already validated above, so just confirm.
  if (action === 'verify') {
    res.status(200).json({ ok: true });
    return;
  }

  if (!COLLECTIONS.includes(collection)) {
    res.status(400).json({ error: 'Unknown collection.' });
    return;
  }

  try {
    let list = await getCollection(collection);

    if (action === 'add') {
      const newItem = { id: makeId(), ...cleanItem(collection, item || {}) };
      list = prepends(collection) ? [newItem, ...list] : [...list, newItem];
    } else if (action === 'update') {
      if (!id) {
        res.status(400).json({ error: 'Missing id.' });
        return;
      }
      let found = false;
      list = list.map((entry) => {
        if (entry.id === id) {
          found = true;
          return { id, ...cleanItem(collection, item || {}) };
        }
        return entry;
      });
      if (!found) {
        res.status(404).json({ error: 'Item not found.' });
        return;
      }
    } else if (action === 'delete') {
      if (!id) {
        res.status(400).json({ error: 'Missing id.' });
        return;
      }
      list = list.filter((entry) => entry.id !== id);
    } else {
      res.status(400).json({ error: 'Unknown action.' });
      return;
    }

    await setCollection(collection, list);
    res.status(200).json({ ok: true, collection, items: list });
  } catch (err) {
    console.error('admin error:', err);
    if (/not configured/i.test(err.message || '')) {
      res.status(503).json({ error: 'Storage is not set up yet, so changes can’t be saved. Finish the Upstash Redis setup first.' });
      return;
    }
    res.status(500).json({ error: 'Something went wrong saving your change.' });
  }
}
