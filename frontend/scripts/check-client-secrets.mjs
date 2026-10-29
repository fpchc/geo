import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const staticRoot = '.next/static';

const forbidden = [
  { pattern: /SENTRY_AUTH_TOKEN/, label: 'SENTRY_AUTH_TOKEN' },
  { pattern: /API_BASE_URL/, label: 'API_BASE_URL' },
  { pattern: /client_secret/i, label: 'client_secret' },
  { pattern: /access_token\s*=/, label: 'access_token write' },
  { pattern: /refresh_token\s*=/, label: 'refresh_token write' },
];

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walk(path);
      continue;
    }

    if (entry.isFile()) {
      yield path;
    }
  }
}

async function main() {
  try {
    await readdir(staticRoot);
  } catch {
    console.error('Client bundle not found. Run `pnpm build` before this check.');
    process.exit(1);
  }

  const hits = [];

  for await (const file of walk(staticRoot)) {
    if (!file.endsWith('.js')) {
      continue;
    }

    const content = await readFile(file, 'utf8');

    for (const { pattern, label } of forbidden) {
      if (pattern.test(content)) {
        hits.push(`${file}: ${label}`);
      }
    }
  }

  if (hits.length > 0) {
    console.error('Forbidden content found in the client bundle:');
    console.error(hits.join('\n'));
    process.exit(1);
  }

  console.log('Client bundle secret check passed.');
}

void main();
