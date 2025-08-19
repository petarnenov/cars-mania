import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { verifyAccessToken, verifyRefreshToken } from '../src/lib/jwt';

const baseEnv = {
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '1209600',
};

async function register(email: string) {
  const res = await request(app).post('/api/auth/register').send({ email, password: '123456', name: 'T' });
  if (res.status !== 201) {
    // Try login if registration fails (user might already exist)
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: '123456' });
    const ck = loginRes.get('set-cookie');
    return Array.isArray(ck) ? ck : ck ? [ck] : [];
  }
  const ck = res.get('set-cookie');
  return Array.isArray(ck) ? ck : ck ? [ck] : [];
}

describe('middleware', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });

  describe('requireAuth', () => {
    it('requires valid access token in cookies', async () => {
      const cookies = await register(`user_${Date.now()}@ex.com`);
      
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);
      
      expect(res.status).toBe(200);
    });

    it('requires valid access token in Authorization header', async () => {
      const cookies = await register(`user_${Date.now()}@ex.com`);
      
      // Extract token from cookies
      const cookieStr = cookies.join(';');
      const accessTokenMatch = cookieStr.match(/accessToken=([^;]+)/);
      const token = accessTokenMatch ? accessTokenMatch[1] : '';
      
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });

    it('rejects invalid Authorization header format', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token');
      
      expect(res.status).toBe(401);
    });

    it('rejects missing Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', '');
      
      expect(res.status).toBe(401);
    });

    it('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['accessToken=invalid-token']);
      
      expect(res.status).toBe(401);
    });

    it('rejects missing token', async () => {
      const res = await request(app)
        .get('/api/auth/me');
      
      expect(res.status).toBe(401);
    });
  });

  describe('requireAdmin', () => {
    it('allows admin access', async () => {
      const userEmail = `admin_${Date.now()}@ex.com`;
      await register(userEmail);
      await request(app).post('/api/test/make-admin').send({ email: userEmail });
      
      const loginRes = await request(app).post('/api/auth/login').send({ email: userEmail, password: '123456' });
      const cookies = loginRes.get('set-cookie');
      const adminCookies = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
      
      const res = await request(app)
        .get('/api/cars/admin/list')
        .set('Cookie', adminCookies);
      
      expect(res.status).toBe(200);
    });

    it('rejects user access to admin endpoints', async () => {
      const userCookies = await register(`user_${Date.now()}@ex.com`);
      
      const res = await request(app)
        .get('/api/cars/admin/list')
        .set('Cookie', userCookies);
      
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated access to admin endpoints', async () => {
      const res = await request(app)
        .get('/api/cars/admin/list');
      
      expect(res.status).toBe(401);
    });
  });

  describe('requireUser', () => {
    it('allows user access to user endpoints', async () => {
      const userCookies = await register(`user_${Date.now()}@ex.com`);
      
      const res = await request(app)
        .post('/api/cars')
        .set('Cookie', userCookies)
        .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' });
      
      expect(res.status).toBe(201);
    });

    it('rejects admin access to user endpoints', async () => {
      const userEmail = `admin_${Date.now()}@ex.com`;
      await register(userEmail);
      await request(app).post('/api/test/make-admin').send({ email: userEmail });
      
      const loginRes = await request(app).post('/api/auth/login').send({ email: userEmail, password: '123456' });
      const cookies = loginRes.get('set-cookie');
      const adminCookies = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
      
      const res = await request(app)
        .post('/api/cars')
        .set('Cookie', adminCookies)
        .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' });
      
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated access to user endpoints', async () => {
      const res = await request(app)
        .post('/api/cars')
        .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' });
      
      expect(res.status).toBe(401);
    });
  });
});

describe('JWT functions', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });

  describe('verifyAccessToken', () => {
    it('throws error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow();
    });

    it('throws error for token with wrong secret', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE1MTYyMzkwMjJ9.invalid-signature';
      
      expect(() => {
        verifyAccessToken(token);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('throws error for invalid token', () => {
      expect(() => {
        verifyRefreshToken('invalid-token');
      }).toThrow();
    });

    it('throws error for token with wrong secret', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE1MTYyMzkwMjJ9.invalid-signature';
      
      expect(() => {
        verifyRefreshToken(token);
      }).toThrow();
    });
  });
});
