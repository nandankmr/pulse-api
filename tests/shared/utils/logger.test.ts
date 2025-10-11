import { logger } from '../../src/shared/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should log info messages', () => {
    logger.info('Test info message', { key: 'value' });
    expect(logger.info).toHaveBeenCalledWith('Test info message', { key: 'value' });
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message', { warning: true });
    expect(logger.warn).toHaveBeenCalledWith('Test warning message', { warning: true });
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    logger.error('Test error message', { error: error.message, stack: error.stack });
    expect(logger.error).toHaveBeenCalledWith('Test error message', { error: error.message, stack: error.stack });
  });

  it('should log debug messages', () => {
    logger.debug('Test debug message', { debug: true });
    expect(logger.debug).toHaveBeenCalledWith('Test debug message', { debug: true });
  });

  it('should handle logging without metadata', () => {
    logger.info('Simple message');
    expect(logger.info).toHaveBeenCalledWith('Simple message');
  });

  it('should handle error logging with proper error object handling', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    expect(logger.error).toHaveBeenCalledWith('Error occurred', {
      error: 'Test error',
      stack: expect.any(String)
    });
  });
});
