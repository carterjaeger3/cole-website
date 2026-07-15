import { createClient } from '@supabase/supabase-js';

// Public, editable collections. Anything not in this list is rejected by the
// admin API's add/update actions.
export const COLLECTIONS = ['prayers', 'books', 'verses', 'newsletters', 'travels'];

// Collections that have a detail page (image + summary + full content).
export const DETAIL_COLLECTIONS = ['books', 'travels', 'newsletters'];

// Seed content = the placeholders the site launched with. Used only as a
// fallback on the public page if Supabase is briefly unreachable, so the
// site never shows an error instead of content.
export const DEFAULTS = {
  prayers: [
    { id: 'p-seed-1', text: 'For three students discerning whether to apply as missionaries next year.', date: 'Updated July 2026' },
    { id: 'p-seed-2', text: 'For safe travel and good conversations at SPO National Training.', date: 'Updated July 2026' },
    { id: 'p-seed-3', text: 'For provision — a few monthly supporters recently had to step back.', date: 'Updated June 2026' },
  ],
  books: [
    { id: 'b-seed-1', title: 'Introduction to the Devout Life', author: 'St. Francis de Sales', summary: 'Practical and gentle — a good companion for anyone trying to grow in holiness in the middle of a busy, ordinary life.', content: 'Practical and gentle — a good companion for anyone trying to grow in holiness in the middle of a busy, ordinary life.', image_urls: [] },
    { id: 'b-seed-2', title: 'He Leadeth Me', author: 'Fr. Walter Ciszek, S.J.', summary: 'A hard, honest account of finding God’s presence in suffering. Reread this before every mission trip.', content: 'A hard, honest account of finding God’s presence in suffering. Reread this before every mission trip.', image_urls: [] },
    { id: 'b-seed-3', title: 'The Screwtape Letters', author: 'C.S. Lewis', summary: 'Sharp, funny, and uncomfortably accurate about the small ways we talk ourselves out of holiness.', content: 'Sharp, funny, and uncomfortably accurate about the small ways we talk ourselves out of holiness.', image_urls: [] },
  ],
  verses: [
    { id: 'v-seed-1', text: 'I have called you by name, you are mine.', ref: 'Isaiah 43:1' },
    { id: 'v-seed-2', text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
    { id: 'v-seed-3', text: 'For I know the plans I have for you, declares the Lord.', ref: 'Jeremiah 29:11' },
    { id: 'v-seed-4', text: 'Go therefore and make disciples of all nations.', ref: 'Matthew 28:19' },
  ],
  newsletters: [
    { id: 'n-seed-1', month: 'June 2026', title: 'Finishing the Year Strong', summary: 'End-of-year highlights from campus ministry, a recap of the spring retreat, and summer plans.', content: 'End-of-year highlights from campus ministry, a recap of the spring retreat, and summer plans.', link: '', image_urls: [] },
    { id: 'n-seed-2', month: 'May 2026', title: 'Baptisms & Send-Offs', summary: 'Two students were baptized this month, and the graduating seniors were commissioned for mission.', content: 'Two students were baptized this month, and the graduating seniors were commissioned for mission.', link: '', image_urls: [] },
    { id: 'n-seed-3', month: 'April 2026', title: 'Holy Week on Campus', summary: 'How the household lived out Triduum together, plus a few answered prayers from Lent.', content: 'How the household lived out Triduum together, plus a few answered prayers from Lent.', link: '', image_urls: [] },
    { id: 'n-seed-4', month: 'March 2026', title: 'Spring Retreat Recap', summary: '60 students, one weekend, and a lot of good confessions. Photos and testimonies inside.', content: '60 students, one weekend, and a lot of good confessions. Photos and testimonies inside.', link: '', image_urls: [] },
  ],
  travels: [
    { id: 't-seed-1', date: 'Jul 2026', title: 'SPO National Training — Mendota Heights, MN', summary: 'A week of formation with missionaries from every SPO chapter before the new school year begins.', content: 'A week of formation with missionaries from every SPO chapter before the new school year begins.', image_urls: [] },
    { id: 't-seed-2', date: 'Mar 2026', title: 'KU Spring Retreat — Rock Springs, KS', summary: 'Led small groups and gave a talk on identity in Christ for 60 students over the weekend.', content: 'Led small groups and gave a talk on identity in Christ for 60 students over the weekend.', image_urls: [] },
    { id: 't-seed-3', date: 'Jan 2026', title: 'SEEK Conference — St. Louis, MO', summary: 'Brought a group of KU students to SEEK for a week of talks, Adoration, and confession lines that didn’t quit.', content: 'Brought a group of KU students to SEEK for a week of talks, Adoration, and confession lines that didn’t quit.', image_urls: [] },
  ],
};

// How each table is ordered and which app-level fields it has. Field names
// match the Postgres column names directly — no translation needed.
const TABLE_CONFIG = {
  prayers:     { ascending: false, fields: ['text', 'date'] },
  books:       { ascending: true,  fields: ['title', 'author', 'summary', 'content', 'image_urls'] },
  verses:      { ascending: false, fields: ['text', 'ref'] },
  newsletters: { ascending: false, fields: ['month', 'title', 'summary', 'content', 'link', 'image_urls'] },
  travels:     { ascending: false, fields: ['date', 'title', 'summary', 'content', 'image_urls'] },
  submissions: { ascending: false, fields: ['name', 'contact', 'intention', 'anonymous'] },
};

function requireTable(table) {
  const cfg = TABLE_CONFIG[table];
  if (!cfg) throw new Error(`Unknown table: ${table}`);
  return cfg;
}

function toDbRow(table, fields) {
  const cfg = requireTable(table);
  const row = {};
  for (const key of cfg.fields) {
    row[key] = fields[key];
  }
  return row;
}

function fromDbRow(table, row) {
  const cfg = requireTable(table);
  const item = { id: row.id, created_at: row.created_at };
  for (const key of cfg.fields) {
    item[key] = row[key];
  }
  return item;
}

let client;

// Build the Supabase client once, using the secret service_role key. This is
// server-only code (API routes) — the key must never reach the browser.
export function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function getCollection(table) {
  const cfg = requireTable(table);
  const { data, error } = await getClient()
    .from(table)
    .select('*')
    .order('created_at', { ascending: cfg.ascending });
  if (error) throw new Error(error.message);
  return data.map((row) => fromDbRow(table, row));
}

// Fetch a single row by id — used by the detail pages. Returns null if not found.
export async function getItem(table, id) {
  requireTable(table);
  const { data, error } = await getClient().from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDbRow(table, data) : null;
}

export async function addItem(table, fields) {
  requireTable(table);
  const { data, error } = await getClient()
    .from(table)
    .insert(toDbRow(table, fields))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromDbRow(table, data);
}

// Returns the updated item, or null if no row with that id exists.
export async function updateItem(table, id, fields) {
  requireTable(table);
  const { data, error } = await getClient()
    .from(table)
    .update(toDbRow(table, fields))
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDbRow(table, data) : null;
}

export async function deleteItem(table, id) {
  requireTable(table);
  const { error } = await getClient().from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Read all five public collections at once, for the home page and the admin lists.
export async function getAll() {
  const out = {};
  for (const name of COLLECTIONS) {
    out[name] = await getCollection(name);
  }
  return out;
}
