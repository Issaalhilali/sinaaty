/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: { '^@app/(.*)$': '<rootDir>/src/$1', '^@sinaaty/(.*)$': '<rootDir>/../../packages/$1/src' },
  testRegex: '(src/.*\\.spec\\.ts|src/.*/__tests__/.*\\.test\\.ts)$',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
};
