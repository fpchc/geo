import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 320 * 1024;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const buildManifest = readJson('.next/build-manifest.json');
const clientManifest = readFileSync(
  '.next/server/app/(app)/dashboard/page_client-reference-manifest.js',
  'utf8',
);

const rootFiles = [...(buildManifest.polyfillFiles ?? []), ...(buildManifest.rootMainFiles ?? [])];
const pageFiles = [...clientManifest.matchAll(/_next\/(static\/chunks\/[^"]+\.js)/g)].map(
  (match) => match[1],
);
const files = [...new Set([...rootFiles, ...pageFiles])];
const rows = [];

for (const file of files) {
  try {
    const size = gzipSync(readFileSync(join('.next', file))).length;
    rows.push({ file, size });
  } catch {
    // Ignore files that are not part of this build.
  }
}

rows.sort((a, b) => b.size - a.size);
const total = rows.reduce((sum, row) => sum + row.size, 0);

console.log(
  `Initial dashboard JS (gzip): ${(total / 1024).toFixed(1)} KiB / ${(BUDGET_BYTES / 1024).toFixed(0)} KiB`,
);

for (const row of rows.slice(0, 10)) {
  console.log(`  ${(row.size / 1024).toFixed(1)} KiB ${row.file}`);
}

if (total > BUDGET_BYTES) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
