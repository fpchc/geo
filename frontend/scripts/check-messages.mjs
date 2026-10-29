import { readFile } from 'node:fs/promises';

const LOCALES = ['zh-CN', 'en-US'];

function flatten(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

async function load(locale) {
  const content = await readFile(`src/messages/${locale}.json`, 'utf8');
  return JSON.parse(content);
}

const messages = Object.fromEntries(
  await Promise.all(LOCALES.map(async (locale) => [locale, await load(locale)])),
);
const keys = Object.fromEntries(
  LOCALES.map((locale) => [locale, new Set(flatten(messages[locale]))]),
);
const [reference, ...others] = LOCALES;
let failed = false;

for (const locale of others) {
  const missing = [...keys[reference]].filter((key) => !keys[locale].has(key));
  const extra = [...keys[locale]].filter((key) => !keys[reference].has(key));

  if (missing.length > 0) {
    failed = true;
    console.error(`${locale} is missing keys:\n${missing.join('\n')}`);
  }

  if (extra.length > 0) {
    failed = true;
    console.error(`${locale} has keys not present in ${reference}:\n${extra.join('\n')}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Message keys match across ${LOCALES.join(', ')} (${keys[reference].size} keys).`);
