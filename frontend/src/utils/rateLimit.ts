interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfter?: number;
}

interface RateLimitState {
  requests: number[];
  blocked: boolean;
  blockedUntil?: number;
}

class RateLimiter {
  private state: Map<string, RateLimitState> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private getKey(identifier: string): string {
    return `rate_limit_${identifier}`;
  }

  private cleanup(identifier: string): void {
    const key = this.getKey(identifier);
    const state = this.state.get(key);
    
    if (!state) return;

    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Remove old requests outside the window
    state.requests = state.requests.filter(timestamp => timestamp > windowStart);
    
    // Check if still blocked
    if (state.blocked && state.blockedUntil && now > state.blockedUntil) {
      state.blocked = false;
      state.blockedUntil = undefined;
    }
  }

  canMakeRequest(identifier: string = 'default'): boolean {
    this.cleanup(identifier);
    
    const key = this.getKey(identifier);
    let state = this.state.get(key);
    
    if (!state) {
      state = { requests: [], blocked: false };
      this.state.set(key, state);
    }

    if (state.blocked) {
      return false;
    }

    if (state.requests.length >= this.config.maxRequests) {
      state.blocked = true;
      state.blockedUntil = Date.now() + (this.config.retryAfter || this.config.windowMs);
      return false;
    }

    return true;
  }

  recordRequest(identifier: string = 'default'): void {
    this.cleanup(identifier);
    
    const key = this.getKey(identifier);
    let state = this.state.get(key);
    
    if (!state) {
      state = { requests: [], blocked: false };
      this.state.set(key, state);
    }

    state.requests.push(Date.now());
  }

  getRemainingRequests(identifier: string = 'default'): number {
    this.cleanup(identifier);
    
    const key = this.getKey(identifier);
    const state = this.state.get(key);
    
    if (!state) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - state.requests.length);
  }

  getTimeUntilReset(identifier: string = 'default'): number {
    this.cleanup(identifier);
    
    const key = this.getKey(identifier);
    const state = this.state.get(key);
    
    if (!state || state.requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...state.requests);
    const resetTime = oldestRequest + this.config.windowMs;
    return Math.max(0, resetTime - Date.now());
  }

  isBlocked(identifier: string = 'default'): boolean {
    this.cleanup(identifier);
    
    const key = this.getKey(identifier);
    const state = this.state.get(key);
    
    return state?.blocked || false;
  }

  reset(identifier: string = 'default'): void {
    const key = this.getKey(identifier);
    this.state.delete(key);
  }

  resetAll(): void {
    this.state.clear();
  }
}

// Create rate limiters for different API endpoints
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  retryAfter: 15 * 60 * 1000, // 15 minutes
});

export const uploadRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  retryAfter: 60 * 60 * 1000, // 1 hour
});

export const messagingRateLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 5 * 60 * 1000, // 5 minutes
  retryAfter: 5 * 60 * 1000, // 5 minutes
});

export const carCreationRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  retryAfter: 60 * 60 * 1000, // 1 hour
});

// Utility function to check rate limits before making API calls
export function checkRateLimit(endpoint: string, identifier?: string): boolean {
  let limiter: RateLimiter;
  
  switch (endpoint) {
    case 'auth':
      limiter = authRateLimiter;
      break;
    case 'upload':
      limiter = uploadRateLimiter;
      break;
    case 'messaging':
      limiter = messagingRateLimiter;
      break;
    case 'car-creation':
      limiter = carCreationRateLimiter;
      break;
    default:
      limiter = apiRateLimiter;
  }

  return limiter.canMakeRequest(identifier);
}

// Utility function to record API calls
export function recordApiCall(endpoint: string, identifier?: string): void {
  let limiter: RateLimiter;
  
  switch (endpoint) {
    case 'auth':
      limiter = authRateLimiter;
      break;
    case 'upload':
      limiter = uploadRateLimiter;
      break;
    case 'messaging':
      limiter = messagingRateLimiter;
      break;
    case 'car-creation':
      limiter = carCreationRateLimiter;
      break;
    default:
      limiter = apiRateLimiter;
  }

  limiter.recordRequest(identifier);
}

// Utility function to get rate limit info
export function getRateLimitInfo(endpoint: string, identifier?: string) {
  let limiter: RateLimiter;
  
  switch (endpoint) {
    case 'auth':
      limiter = authRateLimiter;
      break;
    case 'upload':
      limiter = uploadRateLimiter;
      break;
    case 'messaging':
      limiter = messagingRateLimiter;
      break;
    case 'car-creation':
      limiter = carCreationRateLimiter;
      break;
    default:
      limiter = apiRateLimiter;
  }

  return {
    remaining: limiter.getRemainingRequests(identifier),
    timeUntilReset: limiter.getTimeUntilReset(identifier),
    isBlocked: limiter.isBlocked(identifier),
  };
}

// Export the RateLimiter class for custom usage
export { RateLimiter };
export type { RateLimitConfig, RateLimitState };
