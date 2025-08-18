import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

const baseEnv = {
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '1209600',
};

describe('auth', () => {
  it('register + me', async () => {
    Object.assign(process.env, baseEnv);
    const res = await request(app)
      .post('/auth/register')
      .send({ email: `t${Date.now()}@ex.com`, password: '123456', name: 'T' });
    expect(res.status).toBe(200);
    const cookieHeader = res.get('set-cookie');
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : [];
    expect(cookies.join(';')).toContain('accessToken=');

    const me = await request(app).get('/auth/me').set('Cookie', cookies);
    expect(me.status).toBe(200);
    expect(me.body?.email).toBeDefined();
  });
});


