// ESLint flat config for apps/api.
// Enforces the Clean Architecture dependency rule from CLAUDE.md §5.5:
//   interface → application → domain ; infrastructure implements ports.
//   domain never imports frameworks; application never imports infrastructure/interface.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const FRAMEWORK_PATTERNS = [
  '@nestjs/*',
  '@prisma/*',
  'prisma',
  'express',
  'bullmq',
  'ioredis',
  'socket.io',
  'axios',
  'nestjs-pino',
  'pino*',
];

const forbid = (patterns, message) => ({
  'no-restricted-imports': [
    'error',
    { patterns: patterns.map((group) => ({ group: [group], message })) },
  ],
});

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'prisma/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // ---- Layer rules -----------------------------------------------------------
  {
    files: ['src/modules/**/domain/**/*.ts', 'src/common/domain/**/*.ts'],
    rules: forbid(
      [...FRAMEWORK_PATTERNS, '**/application/**', '**/infrastructure/**', '**/interface/**', '@app/prisma/**'],
      'domain/ must stay pure: no frameworks, no outer layers (CLAUDE.md §5.5).',
    ),
  },
  {
    files: ['src/modules/**/application/**/*.ts'],
    rules: forbid(
      [...FRAMEWORK_PATTERNS.filter((p) => p !== '@nestjs/*'), '**/infrastructure/**', '**/interface/**', '@app/prisma/**'],
      'application/ may depend only on domain/ and its own ports (CLAUDE.md §5.5).',
    ),
  },
  {
    files: ['src/modules/**/interface/**/*.ts'],
    rules: forbid(
      ['**/infrastructure/**', '@prisma/*', '@app/prisma/**'],
      'interface/ talks to application use cases only — never to infrastructure or Prisma (CLAUDE.md §5.5).',
    ),
  },
  {
    files: ['test/**/*.ts', 'src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['**/*.mjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { process: 'readonly', console: 'readonly' } },
    rules: { 'no-console': 'off' },
  },
  prettier,
);
