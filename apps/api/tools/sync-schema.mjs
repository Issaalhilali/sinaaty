#!/usr/bin/env node
// Keeps prisma/migrations/00000000000000_init/migration.sql identical to docs/db/schema.sql
// (the human source of truth, CLAUDE.md §5.7). `--check` exits 1 on drift (used in CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const here = resolve(new URL('.', import.meta.url).pathname);
const src = resolve(here, '../../../docs/db/schema.sql');
const dst = resolve(here, '../prisma/migrations/00000000000000_init/migration.sql');
const header = `-- GENERATED FROM docs/db/schema.sql — DO NOT EDIT HERE.\n-- Edit docs/db/schema.sql (source of truth) then run: pnpm --filter api schema:sync\n\n`;
const want = header + readFileSync(src, 'utf8');
const check = process.argv.includes('--check');
let have = '';
try { have = readFileSync(dst, 'utf8'); } catch { /* missing */ }
if (have === want) { console.log('init migration is in sync with docs/db/schema.sql'); process.exit(0); }
if (check) { console.error('DRIFT: prisma init migration differs from docs/db/schema.sql. Run pnpm --filter api schema:sync'); process.exit(1); }
writeFileSync(dst, want);
console.log('init migration updated from docs/db/schema.sql');
