#!/usr/bin/env node
/**
 * Fetches all Pokemon cards with national Pokedex numbers from the TCG API.
 * Saves URL-only data to src/data/cards.json — no images are downloaded.
 *
 * Usage:
 *   node scripts/fetch-cards.mjs
 *   node scripts/fetch-cards.mjs --api-key YOUR_KEY
 *
 * Strategy: query per-generation dex range to stay under API pagination caps.
 * Each generation has ~100-250 Pokemon × many sets = fits in a few pages each.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '../src/data/cards.json');
const PROGRESS_PATH = join(__dirname, '../src/data/cards.progress.json');

const apiKeyIdx = process.argv.indexOf('--api-key');
const apiKey = apiKeyIdx !== -1 ? process.argv[apiKeyIdx + 1] : null;
const PAGE_SIZE = 250;
const DELAY_MS = apiKey ? 150 : 1200;

// Gen ranges — each chunk stays well under API page limits
const DEX_RANGES = [
  { label: 'Gen I',   min: 1,   max: 151 },
  { label: 'Gen II',  min: 152, max: 251 },
  { label: 'Gen III', min: 252, max: 386 },
  { label: 'Gen IV',  min: 387, max: 493 },
  { label: 'Gen V',   min: 494, max: 649 },
  { label: 'Gen VI',  min: 650, max: 721 },
  { label: 'Gen VII', min: 722, max: 809 },
  { label: 'Gen VIII',min: 810, max: 905 },
  { label: 'Gen IX',  min: 906, max: 1025 },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchPage(min, max, page, retries = 4) {
  const params = new URLSearchParams({
    q: `nationalPokedexNumbers:[${min} TO ${max}]`,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    select: 'id,name,nationalPokedexNumbers,types,images,set,number',
  });
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-Api-Key'] = apiKey;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(DELAY_MS * 2 ** attempt, 60000);
      process.stdout.write(` [retry ${attempt}, ${Math.round(backoff/1000)}s]`);
      await sleep(backoff);
    }
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?${params}`, { headers });
    if (res.ok) return res.json();
    const body = await res.text();
    if (attempt === retries) throw new Error(`HTTP ${res.status} (gen ${min}-${max}, page ${page}): ${body}`);
  }
}

function normalize(cards) {
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    dexNumbers: c.nationalPokedexNumbers ?? [],
    types: c.types ?? [],
    imageSmall: c.images?.small ?? '',
    imageLarge: c.images?.large ?? '',
    setId: c.set?.id ?? '',
    setName: c.set?.name ?? '',
    setReleaseDate: c.set?.releaseDate ?? '',
    number: c.number ?? '',
  }));
}

function buildByDex(normalized) {
  const byDex = {};
  for (const card of normalized) {
    const dex = card.dexNumbers[0];
    if (dex == null) continue;
    if (!byDex[dex]) byDex[dex] = [];
    byDex[dex].push(card);
  }
  return byDex;
}

async function fetchRange({ label, min, max }) {
  const first = await fetchPage(min, max, 1);
  const total = first.totalCount;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const cards = [...first.data];
  process.stdout.write(`${label}: ${total} cards (${totalPages}p)`);

  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write('.');
    await sleep(DELAY_MS);
    const { data } = await fetchPage(min, max, page);
    cards.push(...data);
  }
  process.stdout.write(' done\n');
  return cards;
}

async function main() {
  // Load progress if exists
  let progress = { completedRanges: {}, allCards: [] };
  if (existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
    console.log(`Resuming: ${Object.keys(progress.completedRanges).length}/${DEX_RANGES.length} generations done`);
  }

  for (const range of DEX_RANGES) {
    if (progress.completedRanges[range.label]) {
      console.log(`${range.label}: already fetched (${progress.completedRanges[range.label]} cards)`);
      continue;
    }
    await sleep(DELAY_MS);
    const cards = await fetchRange(range);
    progress.allCards.push(...cards);
    progress.completedRanges[range.label] = cards.length;
    writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
  }

  console.log(`\nTotal raw cards: ${progress.allCards.length}. Normalizing and saving...`);
  const normalized = normalize(progress.allCards);
  const byDex = buildByDex(normalized);

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), cards: normalized, byDex }, null, 2));
  console.log(`Saved to ${OUT_PATH}`);

  try { unlinkSync(PROGRESS_PATH); } catch {}
}

main().catch((err) => {
  console.error('\n' + err.message);
  console.error('Progress saved — re-run to resume.');
  process.exit(1);
});
