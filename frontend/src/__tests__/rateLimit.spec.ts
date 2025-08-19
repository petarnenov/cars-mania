import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  RateLimiter, 
  apiRateLimiter, 
  authRateLimiter, 
  checkRateLimit, 
  recordApiCall, 
  getRateLimitInfo 
} from '../utils/rateLimit';

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000, // 1 second for testing
    });
  });

  afterEach(() => {
    limiter.resetAll();
  });

  it('allows requests within limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.canMakeRequest()).toBe(true);
      limiter.recordRequest();
    }
  });

  it('blocks requests after limit exceeded', () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      expect(limiter.canMakeRequest()).toBe(true);
      limiter.recordRequest();
    }

    // 6th request should be blocked
    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('resets after window expires', async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      limiter.recordRequest();
    }

    // Should be blocked
    expect(limiter.canMakeRequest()).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should be allowed again
    expect(limiter.canMakeRequest()).toBe(true);
  });

  it('tracks remaining requests correctly', () => {
    expect(limiter.getRemainingRequests()).toBe(5);

    limiter.recordRequest();
    expect(limiter.getRemainingRequests()).toBe(4);

    limiter.recordRequest();
    expect(limiter.getRemainingRequests()).toBe(3);
  });

  it('provides correct time until reset', () => {
    limiter.recordRequest();
    const timeUntilReset = limiter.getTimeUntilReset();
    
    expect(timeUntilReset).toBeGreaterThan(0);
    expect(timeUntilReset).toBeLessThanOrEqual(1000);
  });

  it('handles multiple identifiers separately', () => {
    // Make requests with different identifiers
    for (let i = 0; i < 5; i++) {
      limiter.recordRequest('user1');
      limiter.recordRequest('user2');
    }

    // Both should be blocked
    expect(limiter.canMakeRequest('user1')).toBe(false);
    expect(limiter.canMakeRequest('user2')).toBe(false);

    // But a new identifier should be allowed
    expect(limiter.canMakeRequest('user3')).toBe(true);
  });

  it('resets specific identifier', () => {
    // Make requests
    for (let i = 0; i < 5; i++) {
      limiter.recordRequest('test');
    }

    // Should be blocked
    expect(limiter.canMakeRequest('test')).toBe(false);

    // Reset
    limiter.reset('test');

    // Should be allowed again
    expect(limiter.canMakeRequest('test')).toBe(true);
  });
});

describe('API Rate Limiters', () => {
  afterEach(() => {
    apiRateLimiter.resetAll();
    authRateLimiter.resetAll();
  });

  it('api rate limiter allows more requests than auth', () => {
    // API limiter should allow 100 requests
    for (let i = 0; i < 50; i++) {
      expect(apiRateLimiter.canMakeRequest()).toBe(true);
      apiRateLimiter.recordRequest();
    }

    // Auth limiter should block after 5 requests
    for (let i = 0; i < 5; i++) {
      expect(authRateLimiter.canMakeRequest()).toBe(true);
      authRateLimiter.recordRequest();
    }

    expect(authRateLimiter.canMakeRequest()).toBe(false);
  });

  it('checkRateLimit function works correctly', () => {
    // Auth endpoint should be more restrictive
    expect(checkRateLimit('auth')).toBe(true);
    expect(checkRateLimit('api')).toBe(true);

    // Make auth requests to hit limit
    for (let i = 0; i < 5; i++) {
      recordApiCall('auth');
    }

    expect(checkRateLimit('auth')).toBe(false);
    expect(checkRateLimit('api')).toBe(true);
  });

  it('getRateLimitInfo provides correct information', () => {
    const info = getRateLimitInfo('auth');
    
    expect(info).toHaveProperty('remaining');
    expect(info).toHaveProperty('timeUntilReset');
    expect(info).toHaveProperty('isBlocked');
    expect(info.remaining).toBe(5);
    expect(info.isBlocked).toBe(false);

    // Make some requests
    recordApiCall('auth');
    recordApiCall('auth');

    const newInfo = getRateLimitInfo('auth');
    expect(newInfo.remaining).toBe(3);
  });

  it('handles different endpoints correctly', () => {
    const endpoints = ['auth', 'upload', 'messaging', 'car-creation', 'api'];
    
    endpoints.forEach(endpoint => {
      expect(checkRateLimit(endpoint)).toBe(true);
      recordApiCall(endpoint);
    });

    // All should still be allowed (except auth which has low limit)
    expect(checkRateLimit('auth')).toBe(true);
    expect(checkRateLimit('upload')).toBe(true);
    expect(checkRateLimit('messaging')).toBe(true);
    expect(checkRateLimit('car-creation')).toBe(true);
    expect(checkRateLimit('api')).toBe(true);
  });
});
