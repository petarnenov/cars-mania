import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General rate limiter for all routes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs (increased by 100x)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased by 100x)
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 uploads per hour (increased by 100x)
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many file uploads, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiter for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20000, // Limit each IP to 20000 requests per windowMs (increased by 100x)
  message: {
    error: 'Too many API requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many API requests, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limiter for messaging
export const messagingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2000, // Limit each IP to 2000 messages per 5 minutes (increased by 100x)
  message: {
    error: 'Too many messages sent, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many messages sent, please try again later.',
      retryAfter: '5 minutes'
    });
  }
});

// Rate limiter for car creation
export const carCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // Limit each IP to 500 car creations per hour (increased by 100x)
  message: {
    error: 'Too many car listings created, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many car listings created, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiter for admin operations
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 5000 admin operations per 15 minutes (increased by 100x)
  message: {
    error: 'Too many admin operations, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many admin operations, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Development rate limiter (more lenient)
export const developmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Much higher limit for development (increased by 100x)
  message: {
    error: 'Development rate limit exceeded.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Development rate limit exceeded.',
      retryAfter: '15 minutes'
    });
  }
});

// Get appropriate rate limiter based on environment
export function getRateLimiter(environment: string = 'production') {
  if (environment === 'development' || environment === 'test') {
    return developmentLimiter;
  }
  return generalLimiter;
}
