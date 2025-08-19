import express from 'express';
import cors from 'cors';
import path from 'path';
import expressStatic from 'express';
import { useCookies } from './middleware/auth';
import { requestLogger, errorLogger } from './middleware/logging';
import { collectMetrics } from './routes/metrics';
import { 
  generalLimiter, 
  authLimiter, 
  uploadLimiter, 
  messagingLimiter, 
  carCreationLimiter,
  adminLimiter,
  getRateLimiter 
} from './middleware/rateLimit';

import authRouter from './routes/auth';
import carsRouter from './routes/cars';
import uploadsRouter from './routes/uploads';
import messagingRouter from './routes/messaging';
import testRouter from './routes/test';
import metricsRouter from './routes/metrics';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(useCookies());

// Rate limiting middleware (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(getRateLimiter(process.env.NODE_ENV));
}

// Operational middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
  app.use(collectMetrics);
}

// Routes with specific rate limiting (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/cars', carCreationLimiter, carsRouter);
  app.use('/api/upload', uploadLimiter, uploadsRouter);
  app.use('/api', messagingLimiter, messagingRouter);
} else {
  app.use('/api/auth', authRouter);
  app.use('/api/cars', carsRouter);
  app.use('/api/upload', uploadsRouter);
  app.use('/api', messagingRouter);
}
app.use('/api/uploads', expressStatic.static(path.join(process.cwd(), 'uploads')));
app.use('/api', metricsRouter);

// test-only helper routes (used by e2e environment)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test', testRouter);
}

// Health check with more detailed info
app.get('/api/health', (_req, res) => {
  const health = {
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  };
  res.json(health);
});

// Error handling middleware (must be last)
if (process.env.NODE_ENV !== 'test') {
  app.use(errorLogger);
}

export default app;


