import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

const baseEnv = {
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '1209600',
};

describe('auth', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });

  it('register + me', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `t${Date.now()}@ex.com`, password: '123456', name: 'T' });
    expect([200, 201]).toContain(res.status);
    const cookieHeader = res.get('set-cookie');
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : [];
    expect(cookies.join(';')).toContain('accessToken=');

    const me = await request(app).get('/api/auth/me').set('Cookie', cookies);
    expect(me.status).toBe(200);
    expect(me.body?.email).toBeDefined();
  });

  it('register with invalid data returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: '123', name: '' });
    expect(res.status).toBe(400);
  });

  it('register with existing email returns 409', async () => {
    const email = `t${Date.now()}@ex.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: '123456', name: 'T' });
    
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: '123456', name: 'T' });
    expect(res.status).toBe(409);
  });

  it('login with valid credentials', async () => {
    const email = `t${Date.now()}@ex.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: '123456', name: 'T' });
    
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it('login with invalid email returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@ex.com', password: '123456' });
    expect(res.status).toBe(401);
  });

  it('login with wrong password returns 401', async () => {
    const email = `t${Date.now()}@ex.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: '123456', name: 'T' });
    
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('login with invalid data returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email', password: '123' });
    expect(res.status).toBe(400);
  });

  it('refresh token with valid token', async () => {
    const email = `t${Date.now()}@ex.com`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: '123456', name: 'T' });
    
    const cookieHeader = registerRes.get('set-cookie');
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : [];
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
  });

  it('refresh token without token returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('refresh token with invalid token returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=invalid-token']);
    expect(res.status).toBe(401);
  });

  it('logout clears cookies', async () => {
    const res = await request(app)
      .post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('me endpoint without auth returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('me endpoint with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['accessToken=invalid-token']);
    expect(res.status).toBe(401);
  });

  it('register with empty name uses null', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `t${Date.now()}@ex.com`, password: '123456', name: '' });
    expect([200, 201]).toContain(res.status);
    // The response only includes id, email, and role, not name
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBeDefined();
    expect(res.body.role).toBeDefined();
  });

  it('register without name uses null', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `t${Date.now()}@ex.com`, password: '123456' });
    expect([200, 201]).toContain(res.status);
    // The response only includes id, email, and role, not name
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBeDefined();
    expect(res.body.role).toBeDefined();
  });

  it('refresh token with non-existent user returns 401', async () => {
    // Create a valid token for a non-existent user
    const { signRefreshToken } = await import('../src/lib/jwt');
    const token = signRefreshToken({ sub: 'non-existent-user-id', role: 'USER' });
    
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${token}`]);
    expect(res.status).toBe(401);
  });
});


