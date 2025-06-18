/**
 * E2E test setup
 * Global setup for all E2E tests
 */

// Increase test timeout for E2E tests
jest.setTimeout(30000);

// Set up environment variables
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.HEADLESS = process.env.HEADLESS || 'true';

// Global teardown to ensure Chrome processes are cleaned up
afterAll(async () => {
  // Give time for Chrome processes to clean up
  await new Promise(resolve => setTimeout(resolve, 1000));
});