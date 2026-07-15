import { Redis } from '@upstash/redis';

// The four editable collections. Anything not in this list is rejected by the API.
export const COLLECTIONS = ['prayers', 'books', 'verses', 'newsletters'];

// Seed content = the placeholders the site launched with. Used only until Cole
// makes his first edit to a collection, so nothing ever shows up blank.
export const DEFAULTS = {
  prayers: [
    { id: 'p-seed-1', text: 'For three students discerning whether to apply as missionaries next year.', date: 'Updated July 2026' },
    { id: 'p-seed-2', text: 'For safe travel and good conversations at SPO National Training.', date: 'Updated July 2026' },
    { id: 'p-seed-3', text: 'For provision — a few monthly supporters recently had to step back.', date: 'Updated June 2026' },
  ],
  books: [
    { id: 'b-seed-1', title: 'Introduction to the Devout Life', author: 'St. Francis de Sales', note: 'Practical and gentle — a good companion for anyone trying to grow in holiness in the middle of a busy, ordinary life.' },
    { id: 'b-seed-2', title: 'He Leadeth Me', author: 'Fr. Walter Ciszek, S.J.', note: 'A hard, honest account of finding God’s presence in suffering. Reread this before every mission trip.' },
    { id: 'b-seed-3', title: 'The Screwtape Letters', author: 'C.S. Lewis', note: 'Sharp, funny, and uncomfortably accurate about the small ways we talk ourselves out of holiness.' },
  ],
  // Verses are stored newest-first: index 0 is the current "Verse of the Week".
  verses: [
    { id: 'v-seed-1', text: 'I have called you by name, you are mine.', ref: 'Isaiah 43:1' },
    { id: 'v-seed-2', text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
    { id: 'v-seed-3', text: 'For I know the plans I have for you, declares the Lord.', ref: 'Jeremiah 29:11' },
    { id: 'v-seed-4', text: 'Go therefore and make disciples of all nations.', ref: 'Matthew 28:19' },
  ],
  // Newsletters stored newest-first.
  newsletters: [
    { id: 'n-seed-1', month: 'June 2026', title: 'Finishing the Year Strong', summary: 'End-of-year highlights from campus ministry, a recap of the spring retreat, and summer plans.', link: '' },
    { id: 'n-seed-2', month: 'May 2026', title: 'Baptisms & Send-Offs', summary: 'Two students were baptized this month, and the graduating seniors were commissioned for mission.', link: '' },
    { id: 'n-seed-3', month: 'April 2026', title: 'Holy Week on Campus', summary: 'How the household lived out Triduum together, plus a few answered prayers from Lent.', link: '' },
    { id: 'n-seed-4', month: 'March 2026', title: 'Spring Retreat Recap', summary: '60 students, one weekend, and a lot of good confessions. Photos and testimonies inside.', link: '' },
  ],
};

let client;

// Build the Redis client once. Supports both the current Upstash Marketplace env
// var names (UPSTASH_REDIS_REST_*) and the older Vercel KV names (KV_REST_API_*).
export function getRedis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('Redis is not configured (missing UPSTASH_REDIS_REST_URL / _TOKEN).');
  }
  client = new Redis({ url, token });
  return client;
}

// Read one collection. Falls back to the seed data if the key has never been written.
export async function getCollection(name) {
  const stored = await getRedis().get(name);
  if (stored == null) {
    return DEFAULTS[name] ? structuredClone(DEFAULTS[name]) : [];
  }
  return Array.isArray(stored) ? stored : [];
}

export async function setCollection(name, items) {
  await getRedis().set(name, items);
  return items;
}

// Read all four collections at once, for the public page and the admin lists.
export async function getAll() {
  const out = {};
  for (const name of COLLECTIONS) {
    out[name] = await getCollection(name);
  }
  return out;
}
