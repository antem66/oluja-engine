import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../src/utils/Logger.js';

describe('Logger (Initial Implementation)', () => {
  // Mock console methods
  const consoleDebugSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Restore original console methods after all tests
  afterEach(() => {
    // Restore mocks after each test to avoid interference
    vi.restoreAllMocks();
  });

  const logger = new Logger();
  const testDomain = 'TestDomain';
  const testMessage = 'This is a test message';
  const testArg1 = { a: 1 };
  const testArg2 = [1, 2, 3];

  it('debug() should call console.log with formatted message', () => {
    logger.debug(testDomain, testMessage, testArg1, testArg2);
    expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    expect(consoleDebugSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[.*Z\] \[DEBUG\] \[TestDomain\]$/), // Regex to match format [Timestamp] [LEVEL] [Domain]
      testMessage,
      testArg1,
      testArg2
    );
    // Ensure other console methods weren't called
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('info() should call console.info with formatted message', () => {
    logger.info(testDomain, testMessage, testArg1);
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[.*Z\] \[INFO\] \[TestDomain\]$/),
      testMessage,
      testArg1
    );
    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('warn() should call console.warn with formatted message', () => {
    logger.warn(testDomain, testMessage);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[.*Z\] \[WARN\] \[TestDomain\]$/),
      testMessage
    );
    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('error() should call console.error with formatted message', () => {
    const errorObj = new Error('Test error');
    logger.error(testDomain, testMessage, errorObj);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[.*Z\] \[ERROR\] \[TestDomain\]$/),
      testMessage,
      errorObj
    );
    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('loadConfig should log using console.log (for now)', () => {
    // Since filtering isn't implemented, loadConfig just logs via console.log
    logger.loadConfig({ defaultLevel: 1 });
    expect(consoleDebugSpy).toHaveBeenCalledTimes(1); // Check console.log specifically
    expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Logger] Configuration loaded'),
        { defaultLevel: 1 }
    );
  });
}); 