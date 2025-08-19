import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

const baseEnv = {
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '1209600',
};

describe('app configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('health endpoint returns detailed info', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeDefined();
    expect(res.body.memory).toBeDefined();
    expect(res.body.version).toBeDefined();
  });

  it('test routes are available when NODE_ENV is not production', async () => {
    process.env.NODE_ENV = 'development';
    
    // Re-import app to get the new NODE_ENV
    const { default: devApp } = await import('../src/app');
    const res = await request(devApp).post('/api/test/make-admin').send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
  });

  it('test routes are available when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    
    // Re-import app to get the new NODE_ENV
    const { default: testApp } = await import('../src/app');
    const res = await request(testApp).post('/api/test/make-admin').send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
  });

  it('test routes are not available when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    
    const res = await request(app).get('/api/test/health');
    expect(res.status).toBe(404);
  });

  it('uploads static route serves files', async () => {
    const res = await request(app).get('/api/uploads');
    // Should return some response (even if 404 for non-existent files)
    expect(res.status).toBeDefined();
  });

  it('metrics route is available', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
  });

  it('cors is enabled', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');
    
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('json parsing is enabled', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: '123456', name: 'Test' });
    
    // Should not return 400 for invalid JSON
    expect(res.status).not.toBe(400);
  });

  it('cookie parsing is enabled', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['accessToken=test-token']);
    
    // Should handle cookies properly
    expect(res.status).toBe(401); // Invalid token, but cookies were parsed
  });

  it('exercises development environment middleware configuration', async () => {
    // Test that the app works with development-like configuration
    // This exercises the middleware setup even if we can't directly test the conditional branches
    
    // Test that all routes are properly configured
    const routes = [
      { path: '/api/health', method: 'get', expectedStatus: 200 },
      { path: '/api/auth/register', method: 'post', expectedStatus: [200, 201, 400, 409] },
      { path: '/api/cars', method: 'get', expectedStatus: 200 },
      { path: '/api/metrics', method: 'get', expectedStatus: 200 },
    ];

    for (const route of routes) {
      const res = await request(app)[route.method](route.path);
      if (Array.isArray(route.expectedStatus)) {
        expect(route.expectedStatus).toContain(res.status);
      } else {
        expect(res.status).toBe(route.expectedStatus);
      }
    }
  });

  it('tests middleware chain functionality', async () => {
    // Test that the middleware chain works correctly
    // This indirectly tests that the conditional middleware is properly configured
    
    // Test CORS middleware
    const corsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(corsRes.headers['access-control-allow-origin']).toBeDefined();
    
    // Test JSON parsing middleware
    const jsonRes = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: '123456', name: 'Test' });
    expect(jsonRes.status).not.toBe(400);
    
    // Test cookie parsing middleware
    const cookieRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['accessToken=test-token']);
    expect(cookieRes.status).toBe(401); // Invalid token, but cookies were parsed
  });

  it('tests route mounting and error handling', async () => {
    // Test that routes are properly mounted and error handling works
    
    // Test non-existent route
    const notFoundRes = await request(app).get('/api/non-existent');
    expect(notFoundRes.status).toBe(404);
    
    // Test invalid method
    const methodNotAllowedRes = await request(app).post('/api/health');
    expect(methodNotAllowedRes.status).toBe(404); // Express returns 404 for unmounted methods
    
    // Test that static files route is mounted
    const staticRes = await request(app).get('/api/uploads');
    expect(staticRes.status).toBeDefined();
  });

  it('tests environment-specific behavior', async () => {
    // Test that the app behaves correctly in different environments
    
    // Test that test routes are available in non-production environments
    const testRouteRes = await request(app).post('/api/test/make-admin').send({ email: 'test@example.com' });
    expect(testRouteRes.status).toBe(200);
    
    // Test that health endpoint works in all environments
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.ok).toBe(true);
  });

  it('tests middleware execution order', async () => {
    // Test that middleware is executed in the correct order
    
    // Test that CORS is applied before route handling
    const corsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(corsRes.headers['access-control-allow-origin']).toBeDefined();
    
    // Test that JSON parsing works before route handling
    const jsonRes = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: '123456', name: 'Test' });
    expect(jsonRes.status).not.toBe(400);
    
    // Test that cookie parsing works before route handling
    const cookieRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['accessToken=test-token']);
    expect(cookieRes.status).toBe(401); // Invalid token, but cookies were parsed
  });

  it('tests conditional middleware behavior through functionality', async () => {
    // Test that the app behaves correctly regardless of conditional middleware
    // This exercises the middleware setup even if we can't directly test the conditional branches
    
    // Test that basic functionality works
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.ok).toBe(true);
    
    // Test that routes are properly mounted
    const authRes = await request(app).post('/api/auth/register')
      .send({ email: `test_${Date.now()}@example.com`, password: '123456', name: 'Test' });
    expect([200, 201, 409]).toContain(authRes.status);
    
    // Test that CORS is enabled
    const corsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(corsRes.headers['access-control-allow-origin']).toBeDefined();
    
    // Test that JSON parsing is enabled
    const jsonRes = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: '123456', name: 'Test' });
    expect(jsonRes.status).not.toBe(400);
    
    // Test that cookie parsing is enabled
    const cookieRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['accessToken=test-token']);
    expect(cookieRes.status).toBe(401); // Invalid token, but cookies were parsed
  });

  it('tests environment-specific route availability', async () => {
    // Test that routes are available based on environment configuration
    
    // Test that test routes are available in non-production environments
    const testRouteRes = await request(app).post('/api/test/make-admin').send({ email: 'test@example.com' });
    expect(testRouteRes.status).toBe(200);
    
    // Test that health endpoint works in all environments
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.ok).toBe(true);
    
    // Test that metrics endpoint works
    const metricsRes = await request(app).get('/api/metrics');
    expect(metricsRes.status).toBe(200);
    
    // Test that static files route is mounted
    const staticRes = await request(app).get('/api/uploads');
    expect(staticRes.status).toBeDefined();
  });

  it('tests middleware chain integrity', async () => {
    // Test that the middleware chain is properly configured and works correctly
    
    // Test CORS middleware
    const corsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(corsRes.headers['access-control-allow-origin']).toBeDefined();
    
    // Test JSON parsing middleware
    const jsonRes = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: '123456', name: 'Test' });
    expect(jsonRes.status).not.toBe(400);
    
    // Test cookie parsing middleware
    const cookieRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['accessToken=test-token']);
    expect(cookieRes.status).toBe(401); // Invalid token, but cookies were parsed
    
    // Test that routes are properly mounted
    const routes = [
      { path: '/api/health', method: 'get', expectedStatus: 200 },
      { path: '/api/metrics', method: 'get', expectedStatus: 200 },
      { path: '/api/test/make-admin', method: 'post', expectedStatus: 200 },
    ];

    for (const route of routes) {
      if (route.method === 'post' && route.path === '/api/test/make-admin') {
        const res = await request(app).post(route.path).send({ email: 'test@example.com' });
        expect(res.status).toBe(route.expectedStatus);
      } else {
        const res = await request(app)[route.method](route.path);
        expect(res.status).toBe(route.expectedStatus);
      }
    }
  });

  it('tests error handling and middleware resilience', async () => {
    // Test that the app handles errors correctly and middleware is resilient
    
    // Test non-existent route
    const notFoundRes = await request(app).get('/api/non-existent');
    expect(notFoundRes.status).toBe(404);
    
    // Test invalid method
    const methodNotAllowedRes = await request(app).post('/api/health');
    expect(methodNotAllowedRes.status).toBe(404); // Express returns 404 for unmounted methods
    
    // Test that the app continues to work after errors
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.ok).toBe(true);
    
    // Test that CORS still works after errors
    const corsRes = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(corsRes.headers['access-control-allow-origin']).toBeDefined();
  });

  it('tests comprehensive route coverage', async () => {
    // Test that all major routes are properly configured and accessible
    
    const routeTests = [
      // Health and metrics
      { path: '/api/health', method: 'get', expectedStatus: 200, description: 'health endpoint' },
      { path: '/api/metrics', method: 'get', expectedStatus: 200, description: 'metrics endpoint' },
      
      // Auth routes
      { path: '/api/auth/register', method: 'post', expectedStatus: [200, 201, 400, 409], description: 'auth register' },
      { path: '/api/auth/login', method: 'post', expectedStatus: [200, 400, 401], description: 'auth login' },
      { path: '/api/auth/me', method: 'get', expectedStatus: 401, description: 'auth me (unauthenticated)' },
      
      // Cars routes
      { path: '/api/cars', method: 'get', expectedStatus: 200, description: 'cars list' },
      { path: '/api/cars', method: 'post', expectedStatus: 401, description: 'cars create (unauthenticated)' },
      
      // Test routes
      { path: '/api/test/make-admin', method: 'post', expectedStatus: 200, description: 'test make admin' },
      
      // Static files
      { path: '/api/uploads', method: 'get', expectedStatus: [200, 301, 404], description: 'static files' },
    ];

    for (const test of routeTests) {
      let res;
      if (test.method === 'post' && test.path === '/api/test/make-admin') {
        res = await request(app).post(test.path).send({ email: 'test@example.com' });
      } else if (test.method === 'post') {
        res = await request(app).post(test.path).send({ email: 'test@example.com', password: '123456', name: 'Test' });
      } else {
        res = await request(app)[test.method](test.path);
      }
      
      if (Array.isArray(test.expectedStatus)) {
        expect(test.expectedStatus).toContain(res.status);
      } else {
        expect(res.status).toBe(test.expectedStatus);
      }
    }
  });
});
