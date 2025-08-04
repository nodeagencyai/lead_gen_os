/**
 * Test suite for logger utility
 * Tests the production-safe logging functionality
 */

import { logger } from '../logger';

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('Logger', () => {
  it('should have all logging methods', () => {
    expect(logger.log).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should call console methods in development mode', () => {
    // Mock development environment (setupTests.ts already mocks this)
    logger.log('test message');
    logger.error('error message');
    logger.warn('warning message');

    expect(console.log).toHaveBeenCalledWith('test message');
    expect(console.error).toHaveBeenCalledWith('error message');
    expect(console.warn).toHaveBeenCalledWith('warning message');
  });

  it('should accept multiple arguments', () => {
    logger.log('message', { data: 'test' }, 123);
    
    expect(console.log).toHaveBeenCalledWith('message', { data: 'test' }, 123);
  });

  it('should handle unknown arguments safely', () => {
    expect(() => {
      logger.info(null, undefined, { complex: { nested: 'object' } });
    }).not.toThrow();
  });
});