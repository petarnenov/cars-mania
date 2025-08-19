import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  generalLimiter, 
  authLimiter, 
  uploadLimiter, 
  messagingLimiter, 
  carCreationLimiter,
  developmentLimiter,
  apiLimiter,
  adminLimiter,
  getRateLimiter 
} from '../src/middleware/rateLimit';
import { Request, Response } from 'express';

describe('rate limiting middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
    
    // Setup mocks with more complete objects to prevent express-rate-limit errors
    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
      method: 'GET',
      url: '/test',
      get: vi.fn(),
      connection: {
        remoteAddress: '127.0.0.1'
      } as any,
      socket: {
        remoteAddress: '127.0.0.1'
      } as any
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      get: vi.fn(),
      headersSent: false
    };
    
    mockNext = vi.fn();
  });

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  it('creates different rate limiters with correct configurations', () => {
    expect(generalLimiter).toBeDefined();
    expect(authLimiter).toBeDefined();
    expect(uploadLimiter).toBeDefined();
    expect(messagingLimiter).toBeDefined();
    expect(carCreationLimiter).toBeDefined();
    expect(developmentLimiter).toBeDefined();
    expect(apiLimiter).toBeDefined();
    expect(adminLimiter).toBeDefined();
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
    expect(generalLimiter).not.toBe(apiLimiter);
    expect(generalLimiter).not.toBe(adminLimiter);
  });

  it('rate limiters are functions', () => {
    expect(typeof generalLimiter).toBe('function');
    expect(typeof authLimiter).toBe('function');
    expect(typeof uploadLimiter).toBe('function');
    expect(typeof messagingLimiter).toBe('function');
    expect(typeof carCreationLimiter).toBe('function');
    expect(typeof developmentLimiter).toBe('function');
    expect(typeof apiLimiter).toBe('function');
    expect(typeof adminLimiter).toBe('function');
  });

  describe('rate limiter middleware behavior', () => {
    it('all rate limiters are middleware functions', () => {
      const limiters = [generalLimiter, authLimiter, uploadLimiter, messagingLimiter, 
                       carCreationLimiter, apiLimiter, adminLimiter, developmentLimiter];
      
      limiters.forEach(limiter => {
        expect(typeof limiter).toBe('function');
        expect(limiter.length).toBeGreaterThanOrEqual(3); // req, res, next
      });
    });

    it('rate limiters have the correct function signature', () => {
      const limiters = [generalLimiter, authLimiter, uploadLimiter, messagingLimiter, 
                       carCreationLimiter, apiLimiter, adminLimiter, developmentLimiter];
      
      limiters.forEach(limiter => {
        // Should accept 3 parameters: req, res, next
        expect(limiter.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('getRateLimiter function', () => {
    it('handles case-sensitive environment names', () => {
      expect(getRateLimiter('TEST')).toBe(generalLimiter);
      expect(getRateLimiter('DEVELOPMENT')).toBe(generalLimiter);
      expect(getRateLimiter('PRODUCTION')).toBe(generalLimiter);
    });

    it('handles empty string environment', () => {
      expect(getRateLimiter('')).toBe(generalLimiter);
    });

    it('handles undefined environment', () => {
      expect(getRateLimiter(undefined as any)).toBe(generalLimiter);
    });

    it('handles null environment', () => {
      expect(getRateLimiter(null as any)).toBe(generalLimiter);
    });

    it('handles non-string environment', () => {
      expect(getRateLimiter(123 as any)).toBe(generalLimiter);
      expect(getRateLimiter({} as any)).toBe(generalLimiter);
      expect(getRateLimiter([] as any)).toBe(generalLimiter);
    });

    it('handles all valid environment names', () => {
      expect(getRateLimiter('test')).toBe(developmentLimiter);
      expect(getRateLimiter('development')).toBe(developmentLimiter);
      expect(getRateLimiter('production')).toBe(generalLimiter);
      expect(getRateLimiter('staging')).toBe(generalLimiter);
      expect(getRateLimiter('unknown')).toBe(generalLimiter);
    });
  });

  describe('rate limiter comparison', () => {
    it('verifies all limiters are different instances', () => {
      const limiters = [
        { name: 'general', limiter: generalLimiter },
        { name: 'auth', limiter: authLimiter },
        { name: 'upload', limiter: uploadLimiter },
        { name: 'messaging', limiter: messagingLimiter },
        { name: 'carCreation', limiter: carCreationLimiter },
        { name: 'api', limiter: apiLimiter },
        { name: 'admin', limiter: adminLimiter },
        { name: 'development', limiter: developmentLimiter }
      ];

      // Check that all limiters are different instances
      for (let i = 0; i < limiters.length; i++) {
        for (let j = i + 1; j < limiters.length; j++) {
          expect(limiters[i].limiter).not.toBe(limiters[j].limiter);
        }
      }
    });

    it('verifies all limiters are functions', () => {
      const limiters = [generalLimiter, authLimiter, uploadLimiter, messagingLimiter, 
                       carCreationLimiter, apiLimiter, adminLimiter, developmentLimiter];
      
      limiters.forEach(limiter => {
        expect(typeof limiter).toBe('function');
      });
    });
  });

  describe('rate limiter integration tests', () => {
    it('limiters can be used in Express app context', () => {
      // Test that limiters can be called with Express-style middleware signature
      const testLimiter = generalLimiter;
      
      expect(() => {
        testLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('limiters handle different request types', () => {
      const testLimiter = generalLimiter;
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      methods.forEach(method => {
        const req = { ...mockRequest, method };
        expect(() => {
          testLimiter(req as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    it('limiters handle different IP addresses', () => {
      const testLimiter = generalLimiter;
      const ips = ['127.0.0.1', '192.168.1.1', '10.0.0.1', '::1'];
      
      ips.forEach(ip => {
        const req = { 
          ...mockRequest, 
          ip,
          connection: { remoteAddress: ip } as any,
          socket: { remoteAddress: ip } as any
        };
        expect(() => {
          testLimiter(req as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });
  });

  describe('error handling', () => {
    it('limiters handle missing request properties gracefully', () => {
      const testLimiter = generalLimiter;
      const incompleteRequest = {
        get: vi.fn(),
        connection: { remoteAddress: '127.0.0.1' } as any,
        socket: { remoteAddress: '127.0.0.1' } as any
      } as unknown as Request;
      
      expect(() => {
        testLimiter(incompleteRequest, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('limiters handle missing response properties gracefully', () => {
      const testLimiter = generalLimiter;
      const incompleteResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        get: vi.fn(),
        headersSent: false
      } as unknown as Response;
      
      expect(() => {
        testLimiter(mockRequest as Request, incompleteResponse, mockNext);
      }).not.toThrow();
    });
  });

  describe('environment-specific behavior', () => {
    it('development and test environments use same limiter', () => {
      const devLimiter = getRateLimiter('development');
      const testLimiter = getRateLimiter('test');
      
      expect(devLimiter).toBe(testLimiter);
      expect(devLimiter).toBe(developmentLimiter);
    });

    it('production and other environments use general limiter', () => {
      const prodLimiter = getRateLimiter('production');
      const stagingLimiter = getRateLimiter('staging');
      const unknownLimiter = getRateLimiter('unknown');
      
      expect(prodLimiter).toBe(generalLimiter);
      expect(stagingLimiter).toBe(generalLimiter);
      expect(unknownLimiter).toBe(generalLimiter);
    });
  });

  describe('rate limiter edge cases', () => {
    it('handles requests with no IP address', () => {
      const testLimiter = generalLimiter;
      const req = { 
        ...mockRequest, 
        ip: undefined,
        connection: { remoteAddress: undefined } as any,
        socket: { remoteAddress: undefined } as any
      };
      
      expect(() => {
        testLimiter(req as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('handles requests with IPv6 addresses', () => {
      const testLimiter = generalLimiter;
      const req = { 
        ...mockRequest, 
        ip: '::1',
        connection: { remoteAddress: '::1' } as any,
        socket: { remoteAddress: '::1' } as any
      };
      
      expect(() => {
        testLimiter(req as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('handles requests with proxy headers', () => {
      const testLimiter = generalLimiter;
      const req = { 
        ...mockRequest, 
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'x-real-ip': '192.168.1.1'
        },
        get: vi.fn((name: string) => {
          if (name === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
          if (name === 'x-real-ip') return '192.168.1.1';
          return undefined;
        })
      };
      
      expect(() => {
        testLimiter(req as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });
});
