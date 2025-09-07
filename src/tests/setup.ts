/**
 * Jest test setup file
 */

// Mock Azure Functions context
global.console = {
  ...console,
  // Override specific console methods for testing
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};