import { getClient } from '../lib/store.js';
import { readBody } from '../lib/http.js';

// Admin-password-protected image upload, used by the book/mission-trip/
// newsletter forms. Uploads go to a public Supabase Storage bucket and the
// endpoint returns the public URL to save alongside the item.
const BUCKET = 'site-images';
const MAX_BYTES = 4 * 1024 * 1024; // keep base64 payloads comfortably under Vercel's body limit

let bucketReady = false;

// Creates the bucket on first use so no manual Supabase dashboard step is needed.
async function ensureBucket() {
  if (bucketReady) return;
  const supabase = getClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(listError.message);
  const exists = (buckets || []).some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    });
    if (error && !/already exists/i.test(error.message || '')) {
      throw new Error(error.message);
    }
  }
  bucketReady = true;
}

function extFromContentType(contentType) {
  if (/jpeg|jpg/.test(contentType)) return 'jpg';
  if (/png/.test(contentType)) return 'png';
  if (/webp/.test(contentType)) return 'webp';
  if (/gif/.test(contentType)) return 'gif';
  return 'jpg';
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

  const { dataBase64, contentType } = body;
  if (!dataBase64 || !contentType || !contentType.startsWith('image/')) {
    res.status(400).json({ error: 'Please choose an image file.' });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(dataBase64, 'base64');
  } catch {
    res.status(400).json({ error: 'Invalid image data.' });
    return;
  }
  if (!buffer.length) {
    res.status(400).json({ error: 'Invalid image data.' });
    return;
  }
  if (buffer.length > MAX_BYTES) {
    res.status(400).json({ error: 'That image is too large — please use a file under 4MB.' });
    return;
  }

  try {
    await ensureBucket();
    const ext = extFromContentType(contentType);
    const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const supabase = getClient();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    res.status(200).json({ ok: true, url: pub.publicUrl });
  } catch (err) {
    console.error('upload error:', err);
    if (/not configured/i.test(err.message || '')) {
      res.status(503).json({ error: 'Storage is not set up yet. Finish the Supabase setup first.' });
      return;
    }
    res.status(500).json({ error: 'Something went wrong uploading the image.' });
  }
}
