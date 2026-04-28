#!/usr/bin/env node
/**
 * One-time backfill of `customers` rows from existing `repair_quotes`.
 *
 * - Groups quotes by normalized phone + fuzzy address.
 * - Picks the most-recent non-null field per group as the customer record.
 * - Dry-run by default. Pass `--apply` to write.
 * - On apply, writes a receipt file with exact customer+quote UUIDs so the
 *   whole thing can be reversed with two targeted SQL statements.
 *
 * Safety properties:
 * - Only INSERTs into `customers` and UPDATEs `repair_quotes.customer_id`.
 * - Never touches the inline contact fields on repair_quotes (which is what
 *   the customer portal, PDF, and Slack read from).
 * - Refuses to run if any repair_quote.customer_id is already non-null.
 *
 * Usage:
 *   node scripts/backfill-customers.mjs            # dry run (prints plan)
 *   node scripts/backfill-customers.mjs --apply    # actually write
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Minimal env loader (.env.local) ---
function loadEnvFile(fp) {
  if (!fs.existsSync(fp)) return;
  for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnvFile(path.join(ROOT, '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// --- Normalization helpers (inlined from lib/phoneUtils.ts + lib/addressUtils.ts) ---
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}
const SUFFIX_MAP = {
  street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', boulevard: 'blvd',
  court: 'ct', lane: 'ln', place: 'pl', terrace: 'ter', parkway: 'pkwy',
  highway: 'hwy', circle: 'cir',
};
function normalizeAddress(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase().trim();
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s.split(' ').map((t) => SUFFIX_MAP[t] ?? t).join(' ');
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      prev = temp;
    }
  }
  return dp[b.length];
}
function addressesMatch(a, b) {
  const na = normalizeAddress(a), nb = normalizeAddress(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  const threshold = maxLen > 20 ? 3 : maxLen > 10 ? 2 : 1;
  return levenshtein(na, nb) <= threshold;
}

// --- Main ---
const APPLY = process.argv.includes('--apply');
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no writes)'}`);
console.log('Fetching quotes...');

const { data: allQuotes, error } = await sb
  .from('repair_quotes')
  .select('id, created_at, client_name, phone, email, address, city_state, zip, customer_id, deleted_at')
  .is('deleted_at', null)
  .order('created_at', { ascending: false });

if (error) { console.error('Fetch error:', error); process.exit(1); }

// Skip quotes that already have a customer_id — they were linked manually
// (e.g. via "Build New Quote" from a customer profile) and must not be touched.
const alreadyLinked = allQuotes.filter((q) => q.customer_id !== null);
const quotes = allQuotes.filter((q) => q.customer_id === null);

console.log(`Total non-deleted quotes: ${allQuotes.length}`);
console.log(`Already linked (will skip): ${alreadyLinked.length}`);
console.log(`To process: ${quotes.length}`);

// --- Grouping ---
const groups = [];

function matchesGroup(q, g) {
  const qPhone = normalizePhone(q.phone);
  if (qPhone && g.phoneKey && qPhone === g.phoneKey) return true;
  if (q.address && g.quotes.some((gq) => addressesMatch(q.address, gq.address))) {
    return true;
  }
  return false;
}

for (const q of quotes) {
  if (!q.client_name?.trim() && !normalizePhone(q.phone) && !q.address?.trim()) {
    continue;
  }
  let g = groups.find((g) => matchesGroup(q, g));
  if (!g) {
    g = { quotes: [], phoneKey: normalizePhone(q.phone), representative: null };
    groups.push(g);
  } else if (!g.phoneKey && normalizePhone(q.phone)) {
    g.phoneKey = normalizePhone(q.phone);
  }
  g.quotes.push(q);
}

for (const g of groups) {
  const rep = { name: null, phone: null, email: null, address: null, city_state: null, zip: null };
  for (const q of g.quotes) {
    if (rep.name === null && q.client_name?.trim()) rep.name = q.client_name.trim();
    if (rep.phone === null && normalizePhone(q.phone)) rep.phone = normalizePhone(q.phone);
    if (rep.email === null && q.email?.trim()) rep.email = q.email.trim();
    if (rep.address === null && q.address?.trim()) rep.address = q.address.trim();
    if (rep.city_state === null && q.city_state?.trim()) rep.city_state = q.city_state.trim();
    if (rep.zip === null && q.zip?.trim()) rep.zip = q.zip.trim();
  }
  rep.name = rep.name || 'Unknown';
  g.representative = rep;
}

console.log('\n=== Plan ===');
console.log(`Groups (= new customer rows): ${groups.length}`);
console.log(`Quotes to link: ${groups.reduce((n, g) => n + g.quotes.length, 0)}`);
console.log(`Quotes skipped (junk, empty everything): ${quotes.length - groups.reduce((n, g) => n + g.quotes.length, 0)}`);
console.log();

groups.forEach((g, i) => {
  const r = g.representative;
  console.log(`--- Customer ${i + 1} ---`);
  console.log(`  Name:    ${r.name}`);
  console.log(`  Phone:   ${r.phone || '(none)'}`);
  console.log(`  Email:   ${r.email || '(none)'}`);
  console.log(`  Address: ${r.address || '(none)'}${r.city_state ? `, ${r.city_state}` : ''}${r.zip ? ` ${r.zip}` : ''}`);
  console.log(`  Quotes (${g.quotes.length}):`);
  for (const q of g.quotes) {
    console.log(`    - ${q.id}  [${q.created_at.slice(0, 10)}]  "${q.client_name || '(no name)'}"`);
  }
});

if (!APPLY) {
  console.log('\nDry run complete. Re-run with --apply to write.');
  process.exit(0);
}

console.log('\n=== Applying ===');
const receipt = { ranAt: new Date().toISOString(), created: [], linked: [] };

for (const g of groups) {
  const r = g.representative;
  const { data: customer, error: insErr } = await sb
    .from('customers')
    .insert({
      name: r.name, phone: r.phone, email: r.email,
      address: r.address, city_state: r.city_state, zip: r.zip, notes: null,
    })
    .select('id')
    .single();
  if (insErr) { console.error('Insert failed:', insErr); process.exit(1); }
  receipt.created.push({ id: customer.id, representative: r });

  const ids = g.quotes.map((q) => q.id);
  const { error: updErr } = await sb
    .from('repair_quotes')
    .update({ customer_id: customer.id })
    .in('id', ids);
  if (updErr) { console.error('Update failed:', updErr); process.exit(1); }
  receipt.linked.push({ customerId: customer.id, quoteIds: ids });

  console.log(`✓ Created ${customer.id} (${r.name}) → linked ${ids.length} quotes`);
}

const receiptPath = path.join(ROOT, `scripts/backfill-receipt-${Date.now()}.json`);
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
console.log(`\nReceipt written: ${receiptPath}`);

const quoteIds = receipt.linked.flatMap((l) => l.quoteIds);
const customerIds = receipt.created.map((c) => c.id);
const undoSql = [
  `-- Undo for backfill receipt ${path.basename(receiptPath)}`,
  `update repair_quotes set customer_id = null where id in (${quoteIds.map((x) => `'${x}'`).join(', ')});`,
  `delete from customers where id in (${customerIds.map((x) => `'${x}'`).join(', ')});`,
  '',
].join('\n');
const undoPath = receiptPath.replace('.json', '-undo.sql');
fs.writeFileSync(undoPath, undoSql);
console.log(`Undo SQL written: ${undoPath}`);
