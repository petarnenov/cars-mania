import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  generalLimiter, 
  authLimiter, 
  uploadLimiter, 
  messagingLimiter, 
  carCreationLimiter,
  developmentLimiter,
  getRateLimiter 
} from '../src/middleware/rateLimit';

describe('rate limiting middleware', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
  });

  it('creates different rate limiters with correct configurations', () => {
    expect(generalLimiter).toBeDefined();
    expect(authLimiter).toBeDefined();
    expect(uploadLimiter).toBeDefined();
    expect(messagingLimiter).toBeDefined();
    expect(carCreationLimiter).toBeDefined();
    expect(developmentLimiter).toBeDefined();
  });

  it('getRateLimiter returns correct limiter for different environments', () => {
    // Test environment should return development limiter
    const testLimiter = getRateLimiter('test');
    expect(testLimiter).toBe(developmentLimiter);

    // Development environment should return development limiter
    const devLimiter = getRateLimiter('development');
    expect(devLimiter).toBe(developmentLimiter);

    // Production environment should return general limiter
    const prodLimiter = getRateLimiter('production');
    expect(prodLimiter).toBe(generalLimiter);

    // Default should return general limiter
    const defaultLimiter = getRateLimiter();
    expect(defaultLimiter).toBe(generalLimiter);
  });

  it('rate limiters are different instances', () => {
    // Check that different limiters are different instances
    expect(generalLimiter).not.toBe(authLimiter);
    expect(generalLimiter).not.toBe(uploadLimiter);
    expect(generalLimiter).not.toBe(messagingLimiter);
    expect(generalLimiter).not.toBe(carCreationLimiter);
    expect(generalLimiter).not.toBe(developmentLimiter);
  });

  it('rate limiters are functions', () => {
    expect(typeof generalLimiter).toBe('function');
    expect(typeof authLimiter).toBe('function');
    expect(typeof uploadLimiter).toBe('function');
    expect(typeof messagingLimiter).toBe('function');
    expect(typeof carCreationLimiter).toBe('function');
    expect(typeof developmentLimiter).toBe('function');
  });
});
