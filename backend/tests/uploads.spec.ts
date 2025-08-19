import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import path from 'path';
import fs from 'fs';

const baseEnv = {
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '1209600',
};

async function register(email: string) {
  const res = await request(app).post('/api/auth/register').send({ email, password: '123456', name: 'T' });
  const ck = res.get('set-cookie');
  return Array.isArray(ck) ? ck : ck ? [ck] : [];
}

async function createCar(cookies: string[]) {
  const res = await request(app)
    .post('/api/cars')
    .set('Cookie', cookies)
    .send({ brand: 'BMW', model: '320d', firstRegistrationDate: '2019-05-01', color: 'blue', priceCents: 1500000, description: 'great' });
  return res.body.id;
}

describe('uploads', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });

  it('upload images successfully', async () => {
    const cookies = await register(`user_${Date.now()}@ex.com`);
    const carId = await createCar(cookies);

    const res = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' })
      .attach('images', Buffer.from('fake-image-data-2'), { filename: 'test2.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].carId).toBe(carId);
    expect(res.body[0].url).toMatch(/^\/uploads\//);
  });

  it('upload without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/upload/cars/some-id/images')
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(401);
  });

  it('upload to non-existent car returns 404', async () => {
    const cookies = await register(`user_${Date.now()}@ex.com`);

    const res = await request(app)
      .post('/api/upload/cars/non-existent-id/images')
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(404);
  });

  it('upload to car owned by another user returns 404', async () => {
    const user1Cookies = await register(`user1_${Date.now()}@ex.com`);
    const user2Cookies = await register(`user2_${Date.now()}@ex.com`);
    const carId = await createCar(user1Cookies);

    const res = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', user2Cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(404);
  });

  it('upload invalid file type returns error', async () => {
    const cookies = await register(`user_${Date.now()}@ex.com`);
    const carId = await createCar(cookies);

    const res = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-text-data'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(500); // multer error
  });

  it('upload more than 3 images returns 400', async () => {
    const cookies = await register(`user_${Date.now()}@ex.com`);
    const carId = await createCar(cookies);

    // First upload 3 images
    await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test1.jpg', contentType: 'image/jpeg' })
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test2.jpg', contentType: 'image/jpeg' })
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test3.jpg', contentType: 'image/jpeg' });

    // Try to upload more images
    const res = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test4.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Max 3 images');
  });

  it('upload to car with existing images respects limit', async () => {
    const cookies = await register(`user_${Date.now()}@ex.com`);
    const carId = await createCar(cookies);

    // Upload 2 images first
    await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test1.jpg', contentType: 'image/jpeg' })
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test2.jpg', contentType: 'image/jpeg' });

    // Upload 1 more image (should work)
    const res = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test3.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.length).toBe(1);

    // Try to upload 2 more images (should fail)
    const res2 = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test4.jpg', contentType: 'image/jpeg' })
      .attach('images', Buffer.from('fake-image-data'), { filename: 'test5.jpg', contentType: 'image/jpeg' });

    expect(res2.status).toBe(400);
    expect(res2.body.error).toBe('Max 3 images');
  });

  it('upload with different image formats', async () => {
    const cookies = await register(`user_${Date.now()}@ex.com`);
    const carId = await createCar(cookies);

    const res = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', Buffer.from('fake-jpeg-data'), { filename: 'test.jpg', contentType: 'image/jpeg' })
      .attach('images', Buffer.from('fake-png-data'), { filename: 'test.png', contentType: 'image/png' })
      .attach('images', Buffer.from('fake-webp-data'), { filename: 'test.webp', contentType: 'image/webp' });

    expect(res.status).toBe(201);
    expect(res.body.length).toBe(3);
  });

  it('upload with large file size should be handled', async () => {
    const cookies = await register(`user_${Date.now()}@ex.com`);
    const carId = await createCar(cookies);

    // Create a large buffer (but not too large to cause issues)
    const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB

    const res = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', cookies)
      .attach('images', largeBuffer, { filename: 'large.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
  });
});


