/**
 * Test server for E2E test fixtures
 * Run this to serve HTML fixtures for E2E tests
 */

import express from 'express';
import * as path from 'path';
import { generateTestFixtures } from './utils/test-helpers';

const app = express();
const PORT = process.env.TEST_SERVER_PORT || 3001;

// Generate fixtures if they don't exist
generateTestFixtures();

// Serve fixtures
const fixturesPath = path.join(__dirname, 'fixtures');
app.use(express.static(fixturesPath));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', fixtures: fixturesPath });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Serving fixtures from: ${fixturesPath}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Test server stopped');
  });
});