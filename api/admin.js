import { COLLECTIONS, getCollection, addItem, updateItem, deleteItem } from '../lib/store.js';
import { readBody } from '../lib/http.js';

// The private prayer-intention inbox. Admin can read (list) and delete these,
// but never add/edit them — they're created only via the public /api/submit.
const ADMIN_READABLE = [...COLLECTIONS, 'submissions'];

// Insert new items at the front for everything except books, which read as a
// running reading list (oldest first). Ordering itself is handled by the
// store layer (created_at ascending/descending); this just documents intent.
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
    case 'travels':
      return { date: s(item.date), title: s(item.title), desc: s(item.desc) };
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

  // Read a collection (used by the admin UI, including the private inbox).
  if (action === 'list') {
    if (!ADMIN_READABLE.includes(collection)) {
      res.status(400).json({ error: 'Unknown collection.' });
      return;
    }
    try {
      const items = await getCollection(collection);
      res.status(200).json({ ok: true, collection, items });
    } catch (err) {
      console.error('admin list error:', err);
      const configErr = /not configured/i.test(err.message || '');
      res.status(configErr ? 503 : 500).json({
        error: configErr ? 'Storage is not set up yet. Finish the Supabase setup first.' : 'Failed to load.',
      });
    }
    return;
  }

  // Mutations. Delete is allowed on the inbox too; add/update only on the
  // public, editable collections.
  const allowed = action === 'delete' ? ADMIN_READABLE : COLLECTIONS;
  if (!allowed.includes(collection)) {
    res.status(400).json({ error: 'Unknown collection.' });
    return;
  }

  try {
    if (action === 'add') {
      await addItem(collection, cleanItem(collection, item || {}));
    } else if (action === 'update') {
      if (!id) {
        res.status(400).json({ error: 'Missing id.' });
        return;
      }
      const updated = await updateItem(collection, id, cleanItem(collection, item || {}));
      if (!updated) {
        res.status(404).json({ error: 'Item not found.' });
        return;
      }
    } else if (action === 'delete') {
      if (!id) {
        res.status(400).json({ error: 'Missing id.' });
        return;
      }
      await deleteItem(collection, id);
    } else {
      res.status(400).json({ error: 'Unknown action.' });
      return;
    }

    const items = await getCollection(collection);
    res.status(200).json({ ok: true, collection, items });
  } catch (err) {
    console.error('admin error:', err);
    if (/not configured/i.test(err.message || '')) {
      res.status(503).json({ error: 'Storage is not set up yet, so changes can’t be saved. Finish the Supabase setup first.' });
      return;
    }
    res.status(500).json({ error: 'Something went wrong saving your change.' });
  }
}
