#!/usr/bin/env node
// Generates src/enums.ts from apps/api/prisma/schema.prisma so TS enums always mirror the DB.
// `--check` exits 1 if the committed file is stale (CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const here = resolve(new URL('.', import.meta.url).pathname);
const schema = readFileSync(resolve(here, '../../../apps/api/prisma/schema.prisma'), 'utf8');
const out = resolve(here, '../src/enums.ts');
const pascal = (s) => s.replace(/(^|_)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

const enums = [];
for (const m of schema.matchAll(/^enum\s+([a-z_0-9]+)\s*\{([\s\S]*?)^\}/gm)) {
  const values = m[2].split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'));
  enums.push({ db: m[1], name: pascal(m[1]), values });
}
enums.sort((a, b) => a.name.localeCompare(b.name));

let ts = `// GENERATED from apps/api/prisma/schema.prisma by tools/gen-enums.mjs — DO NOT EDIT.\n// Regenerate: pnpm --filter @sinaaty/shared-types gen\n\n`;
for (const e of enums) {
  ts += `/** DB enum \`${e.db}\` */\nexport const ${e.name} = {\n`;
  for (const v of e.values) ts += `  ${v}: '${v}',\n`;
  ts += `} as const;\nexport type ${e.name} = (typeof ${e.name})[keyof typeof ${e.name}];\nexport const ${e.name}Values = Object.values(${e.name}) as ${e.name}[];\n\n`;
}
ts += `export const DB_ENUMS = {\n${enums.map((e) => `  ${e.db}: ${e.name}Values,`).join('\n')}\n} as const;\n`;

const check = process.argv.includes('--check');
let have = '';
try { have = readFileSync(out, 'utf8'); } catch { /* none */ }
if (have === ts) { console.log(`enums.ts up to date (${enums.length} enums)`); process.exit(0); }
if (check) { console.error('STALE: packages/shared-types/src/enums.ts — run pnpm --filter @sinaaty/shared-types gen'); process.exit(1); }
writeFileSync(out, ts);
console.log(`wrote enums.ts (${enums.length} enums)`);
