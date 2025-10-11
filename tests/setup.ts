// tests/setup.ts
import { logger } from '../src/shared/utils/logger';

// Mock winston logger for tests to avoid actual logging during test runs
jest.mock('../src/shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test setup can go here
beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});
