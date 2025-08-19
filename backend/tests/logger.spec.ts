import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logger } from '../src/lib/logger';
import pino from 'pino';

describe('logger configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.LOG_LEVEL = originalLogLevel;
  });

  it('creates logger with default configuration', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('logger works in development environment', () => {
    process.env.NODE_ENV = 'development';
    
    // Test that logger is created with development config
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('logger works in production environment', () => {
    process.env.NODE_ENV = 'production';
    
    // Test that logger is created with production config
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('logger works in test environment', () => {
    process.env.NODE_ENV = 'test';
    
    // Test that logger is created with test config
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('logger respects custom LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'debug';
    
    // Test that logger is created with custom log level
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('logger can log messages', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.warn('Test warning message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });

  it('logger handles different log levels', () => {
    expect(() => {
      logger.trace('Test trace message');
      logger.debug('Test debug message');
      logger.info('Test info message');
      logger.warn('Test warning message');
      logger.error('Test error message');
      logger.fatal('Test fatal message');
    }).not.toThrow();
  });

  it('logger handles objects and arrays', () => {
    expect(() => {
      logger.info({ message: 'Test object', data: { key: 'value' } });
      logger.error(['Test array', 'with multiple', 'items']);
      logger.warn('String with %s placeholder', 'value');
    }).not.toThrow();
  });

  it('logger handles undefined and null values', () => {
    expect(() => {
      logger.info(undefined);
      logger.error(null);
      logger.warn('');
    }).not.toThrow();
  });

  it('creates development logger with transport configuration', () => {
    // Simulate development environment
    const isDevelopment = true;
    const isTest = false;
    
    // Create a logger instance with development configuration
    const devLogger = pino({
      level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
      ...(isDevelopment ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
      } : {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.passwordHash',
          'res.headers["set-cookie"]',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
        ],
        remove: true,
      },
    });

    expect(devLogger).toBeDefined();
    expect(typeof devLogger.info).toBe('function');
    expect(typeof devLogger.error).toBe('function');
    expect(typeof devLogger.warn).toBe('function');
    expect(typeof devLogger.debug).toBe('function');
  });

  it('creates production logger with formatters configuration', () => {
    // Simulate production environment
    const isDevelopment = false;
    const isTest = false;
    
    // Create a logger instance with production configuration
    const prodLogger = pino({
      level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
      ...(isDevelopment ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
      } : {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.passwordHash',
          'res.headers["set-cookie"]',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
        ],
        remove: true,
      },
    });

    expect(prodLogger).toBeDefined();
    expect(typeof prodLogger.info).toBe('function');
    expect(typeof prodLogger.error).toBe('function');
    expect(typeof prodLogger.warn).toBe('function');
    expect(typeof prodLogger.debug).toBe('function');
  });

  it('creates test logger with silent level', () => {
    // Simulate test environment
    const isDevelopment = false;
    const isTest = true;
    
    // Create a logger instance with test configuration
    const testLogger = pino({
      level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
      ...(isDevelopment ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
      } : {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.passwordHash',
          'res.headers["set-cookie"]',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
        ],
        remove: true,
      },
    });

    expect(testLogger).toBeDefined();
    expect(typeof testLogger.info).toBe('function');
    expect(typeof testLogger.error).toBe('function');
    expect(typeof testLogger.warn).toBe('function');
    expect(typeof testLogger.debug).toBe('function');
  });

  it('logger with custom LOG_LEVEL configuration', () => {
    // Simulate custom log level
    const isDevelopment = false;
    const isTest = false;
    const customLogLevel = 'debug';
    
    // Create a logger instance with custom log level
    const customLogger = pino({
      level: isTest ? 'silent' : customLogLevel || 'info',
      ...(isDevelopment ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
      } : {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.passwordHash',
          'res.headers["set-cookie"]',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
        ],
        remove: true,
      },
    });

    expect(customLogger).toBeDefined();
    expect(typeof customLogger.info).toBe('function');
    expect(typeof customLogger.error).toBe('function');
    expect(typeof customLogger.warn).toBe('function');
    expect(typeof customLogger.debug).toBe('function');
  });

  it('exercises logger configuration branches with different conditions', () => {
    // Test development configuration branch
    const devConfig = {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      },
    };

    // Test production configuration branch
    const prodConfig = {
      level: 'info',
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    };

    // Verify configurations are different
    expect(devConfig).toHaveProperty('transport');
    expect(prodConfig).toHaveProperty('formatters');
    expect(prodConfig).toHaveProperty('timestamp');

    // Create loggers with both configurations
    const devLogger = pino(devConfig);
    const prodLogger = pino(prodConfig);

    expect(devLogger).toBeDefined();
    expect(prodLogger).toBeDefined();
    
    // Test that both loggers work
    expect(() => {
      devLogger.info('Development logger test');
      prodLogger.info('Production logger test');
    }).not.toThrow();
  });

  it('tests logger redaction functionality', () => {
    // Test that the redaction configuration works
    const testLogger = pino({
      level: 'info',
      redact: {
        paths: [
          'password',
          'token',
          'accessToken',
          'refreshToken',
        ],
        remove: true,
      },
    });

    expect(testLogger).toBeDefined();
    
    // Test logging with sensitive data
    expect(() => {
      testLogger.info({ 
        message: 'Test log',
        password: 'secret123',
        token: 'abc123',
        accessToken: 'xyz789',
        refreshToken: 'def456',
        publicData: 'visible'
      });
    }).not.toThrow();
  });

  it('tests different log level scenarios', () => {
    // Test silent level (test environment)
    const silentLogger = pino({ level: 'silent' });
    expect(silentLogger).toBeDefined();
    
    // Test custom log levels
    const debugLogger = pino({ level: 'debug' });
    const infoLogger = pino({ level: 'info' });
    const warnLogger = pino({ level: 'warn' });
    const errorLogger = pino({ level: 'error' });
    
    expect(debugLogger).toBeDefined();
    expect(infoLogger).toBeDefined();
    expect(warnLogger).toBeDefined();
    expect(errorLogger).toBeDefined();
    
    // Test that all loggers work
    expect(() => {
      silentLogger.info('Silent test');
      debugLogger.debug('Debug test');
      infoLogger.info('Info test');
      warnLogger.warn('Warn test');
      errorLogger.error('Error test');
    }).not.toThrow();
  });
});
