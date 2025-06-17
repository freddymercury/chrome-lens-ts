/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2022',
          moduleResolution: 'node',
        },
      },
    ],
  },
  testMatch: ['**/tests/e2e/**/*.e2e.ts'],
  testTimeout: 30000, // E2E tests need more time
  maxWorkers: 1, // Run E2E tests serially to avoid port conflicts
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
  coverageDirectory: 'coverage/e2e',
  collectCoverageFrom: [
    'tests/e2e/**/*.ts',
    '!tests/e2e/setup.ts',
    '!tests/e2e/**/*.d.ts',
  ],
};