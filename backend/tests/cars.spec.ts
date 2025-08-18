import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app'

async function register(email: string, role: 'USER' | 'ADMIN' = 'USER') {
  const reg = await request(app).post('/auth/register').send({ email, password: '123456', name: 'T' })
  let cookieHeader = reg.get('set-cookie')
  let cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : []
  if (role === 'ADMIN') {
    await request(app).post('/test/make-admin').send({ email })
    const login = await request(app).post('/auth/login').send({ email, password: '123456' })
    cookieHeader = login.get('set-cookie')
    cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : []
  }
  return cookies
}

describe('cars routes', () => {
  it('USER can create draft, ADMIN cannot', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')

    const draftOk = await request(app)
      .post('/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    expect(draftOk.status).toBe(201)

    const draftAdmin = await request(app)
      .post('/cars')
      .set('Cookie', adminCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    expect(draftAdmin.status).toBe(403)
  })

  it('public list returns 200', async () => {
    const res = await request(app).get('/cars').query({ page: 1, pageSize: 5 })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })
})


