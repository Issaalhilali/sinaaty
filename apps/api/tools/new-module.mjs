#!/usr/bin/env node
// Scaffolds a NestJS module with Clean Architecture layers (CLAUDE.md §5.5).
// Usage: pnpm --filter api new:module work-orders
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Usage: new-module <kebab-case-name>');
  process.exit(1);
}
const pascal = name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
const root = join(process.cwd(), 'src', 'modules', name);
if (existsSync(root)) {
  console.error(`Module already exists: ${root}`);
  process.exit(1);
}
const dirs = ['domain', 'application', 'infrastructure', 'interface/http', '__tests__'];
for (const d of dirs) mkdirSync(join(root, d), { recursive: true });

const files = {
  'domain/README.md': `# ${name} — domain\nPure TypeScript only: entities, value objects, enums, domain events, state machines, domain errors, repository PORTS.\nNo Nest / Prisma / provider SDK imports (lint-enforced).\n`,
  'application/README.md': `# ${name} — application\nUse cases (one class per command/query), Zod DTOs, application ports (clock, ids, outbox, integrations).\nOwns the transaction boundary. Depends on domain/ only.\n`,
  'infrastructure/README.md': `# ${name} — infrastructure\nPrisma repositories implementing domain ports, provider adapters (+ .mock.adapter.ts), mappers, BullMQ processors, event subscribers.\n`,
  'interface/http/README.md': `# ${name} — interface/http\nControllers, guards, request/response mappers. No business logic: parse → use case → map response.\n`,
  [`${name}.module.ts`]: `import { Module } from '@nestjs/common';

/** Composition root for ${name}: bind ports → adapters here (env decides mock|live). */
@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class ${pascal}Module {}
`,
  [`__tests__/${name}.test.ts`]: `describe('${name}', () => {
  it('has domain tests that run without a database', () => {
    expect(true).toBe(true);
  });
});
`,
};
for (const [rel, content] of Object.entries(files)) writeFileSync(join(root, rel), content);
console.log(`Created src/modules/${name}/ with layers: ${dirs.join(', ')}`);
console.log(`Next: import ${pascal}Module in src/app.module.ts and start with domain/ first.`);
