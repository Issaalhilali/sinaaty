#!/usr/bin/env node
// Post-processes an introspected prisma/schema.prisma (from `prisma db pull`) so it follows
// CLAUDE.md §5.6: PascalCase model names + camelCase field names, with @@map/@map back to the
// snake_case DB names. Enum values stay as-is (they mirror DB enums, see packages/shared-types).
// Idempotent: running it twice is a no-op.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(new URL('.', import.meta.url).pathname, '../prisma/schema.prisma');
let src = readFileSync(file, 'utf8');

const pascal = (s) => s.replace(/(^|_)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const camel = (s) => s.replace(/_+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
// Prisma names singular-ish models nicely? No — db pull keeps table names. We keep plural table
// names but PascalCase them (WorkOrders → keep as `WorkOrder`? we singularize simple plurals).
const singular = (s) => {
  if (/ies$/.test(s)) return s.replace(/ies$/, 'y');
  if (/(ses|xes|zes|ches|shes)$/.test(s)) return s.replace(/es$/, '');
  if (/s$/.test(s) && !/ss$/.test(s)) return s.replace(/s$/, '');
  return s;
};
const modelName = (table) => {
  const parts = table.split('_');
  parts[parts.length - 1] = singular(parts[parts.length - 1]);
  return pascal(parts.join('_'));
};

// 1) collect model blocks
const modelRe = /^model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)^\}/gm;
const tables = new Map(); // table -> Model
for (const m of src.matchAll(modelRe)) {
  const name = m[1];
  if (/^[A-Z]/.test(name) && !name.includes('_')) continue; // already normalized
  tables.set(name, modelName(name));
}
if (tables.size === 0) {
  console.log('schema.prisma already normalized — nothing to do');
  process.exit(0);
}

// 2) rewrite each block
src = src.replace(modelRe, (whole, name, body) => {
  if (!tables.has(name)) return whole;
  const Model = tables.get(name);
  const lines = body.split('\n');
  const out = [];
  let hasMap = false;
  for (let line of lines) {
    const t = line.trim();
    if (t.startsWith('@@map(')) hasMap = true;
    // field line: `  field_name  Type  attrs`
    const fm = /^(\s+)([a-z][A-Za-z0-9_]*)(\s+)([A-Za-z0-9_[\]?]+)(.*)$/.exec(line);
    if (fm && !t.startsWith('@@') && !t.startsWith('//')) {
      let [, indent, field, gap, type, rest] = fm;
      // relation type rename
      const baseType = type.replace(/[[\]?]/g, '');
      const suffix = type.slice(baseType.length);
      if (tables.has(baseType)) type = tables.get(baseType) + suffix;
      // rename referenced fields inside @relation(fields: [...], references: [...])
      rest = rest.replace(/(fields|references):\s*\[([^\]]*)\]/g, (_, k, list) =>
        `${k}: [${list.split(',').map((f) => camel(f.trim())).join(', ')}]`,
      );
      const isScalar = !tables.has(baseType);
      const camelField = camel(field);
      if (camelField !== field && isScalar && !rest.includes('@map(')) rest = `${rest} @map("${field}")`;
      // Relation field names. Prisma disambiguates duplicates as `<target>_<src>_<fkcol>To<target>`;
      // rewrite those deterministically: FK side → camel(fkcol sans _id) [+ TargetModel if no _id],
      // reverse side → camel(srcTable) + 'As' + Pascal(fkcol sans _id). Others → camelCase.
      let relName = camel(field);
      const dis = /^([a-z0-9_]+?)_(\1|[a-z0-9_]+?)_([a-z0-9_]+)To([a-z0-9_]+)$/.exec(field);
      if (!isScalar && field.includes('To')) {
        const m = /^(.+)To([a-z0-9_]+)$/.exec(field);
        if (m) {
          const target = m[2];
          const head = m[1]; // `<targetTable>_<srcTable>_<fkcol>`
          const stripped = head.startsWith(target + '_') ? head.slice(target.length + 1) : head;
          const targetSingular = tables.get(target) ?? pascal(target);
          if (rest.includes('fields:')) {
            // FK side: srcTable is the current model (name); fkcol = stripped minus `<name>_`
            const fkcol = stripped.startsWith(name + '_') ? stripped.slice(name.length + 1) : stripped;
            const base = camel(fkcol.replace(/_id$/, ''));
            relName = /_id$/.test(fkcol) ? base : base + targetSingular;
          } else {
            // reverse side: stripped = `<srcTable>_<fkcol>`; srcTable = the base table (from type)
            const src = baseType; // e.g. disputes
            let fkcol = stripped;
            while (fkcol.startsWith(src + '_')) fkcol = fkcol.slice(src.length + 1);
            relName = camel(src) + 'As' + pascal(fkcol.replace(/_id$/, ''));
          }
        }
      }
      void dis;
      line = `${indent}${isScalar ? camelField : relName}${gap}${type}${rest}`;
    } else if (t.startsWith('@@')) {
      // @@index([a_b, c]) / @@unique / @@id → camelCase field refs
      line = line.replace(/\[([^\]]*)\]/g, (_, list) =>
        `[${list
          .split(',')
          .map((f) => {
            const x = f.trim();
            const m2 = /^([a-z][a-z0-9_]*)(\(.*\))?$/.exec(x);
            return m2 ? camel(m2[1]) + (m2[2] ?? '') : x;
          })
          .join(', ')}]`,
      );
    }
    out.push(line);
  }
  if (!hasMap) {
    // insert before closing: keep last blank line tidy
    while (out.length && out[out.length - 1].trim() === '') out.pop();
    out.push('', `  @@map("${name}")`, '');
  }
  return `model ${Model} {${out.join('\n')}}`;
});

writeFileSync(file, src);
console.log(`normalized ${tables.size} models → PascalCase/camelCase with @map`);
