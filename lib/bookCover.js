// Best-effort automatic book cover lookup, used when a book is saved without
// an uploaded image. Tries Open Library first (no API key needed), then
// Google Books as a fallback. Returns a cover image URL, or null if neither
// source has a match — callers should leave the image blank in that case.

async function tryOpenLibrary(title, author) {
  const params = new URLSearchParams({ title, limit: '1' });
  if (author) params.set('author', author);
  const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data.docs && data.docs[0];
  if (doc && doc.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  }
  return null;
}

async function tryGoogleBooks(title, author) {
  const q = `intitle:${title}${author ? ' inauthor:' + author : ''}`;
  const params = new URLSearchParams({ q, maxResults: '1' });
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items && data.items[0];
  const thumb = item && item.volumeInfo && item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail;
  return thumb ? thumb.replace(/^http:/, 'https:') : null;
}

export async function fetchBookCover(title, author) {
  if (!title) return null;
  try {
    const fromOpenLibrary = await tryOpenLibrary(title, author);
    if (fromOpenLibrary) return fromOpenLibrary;
  } catch (err) {
    console.error('Open Library cover lookup failed:', err);
  }
  try {
    const fromGoogleBooks = await tryGoogleBooks(title, author);
    if (fromGoogleBooks) return fromGoogleBooks;
  } catch (err) {
    console.error('Google Books cover lookup failed:', err);
  }
  return null;
}
