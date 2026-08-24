import { defineConfig } from 'vitest/config';

/** وحدات فقط. `e2e/` ملك Playwright — و`vitest run` كان يلتقطه ويفشل بمكتبة ليست له. */
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], exclude: ['node_modules', 'e2e', '.next'] },
});
