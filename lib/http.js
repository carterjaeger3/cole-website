// Small shared helpers for the API endpoints.

export function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Read and JSON-parse a request body, whether or not the runtime pre-parsed it.
export async function readBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
