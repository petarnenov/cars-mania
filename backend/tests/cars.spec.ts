import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app'

async function register(email: string, role: 'USER' | 'ADMIN' = 'USER') {
  const reg = await request(app).post('/auth/register').send({ email, password: '123456', name: 'T' })
  if (role === 'ADMIN') {
    await request(app).post('/test/make-admin').send({ email })
  }
  return reg.get('set-cookie')
}

describe('cars routes', () => {
  it('USER can create draft, ADMIN cannot', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')

    const draftOk = await request(app)
      .post('/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistration: '2018-01-01', color: 'black', price: 9000, description: 'nice' })
    expect(draftOk.status).toBe(201)

    const draftAdmin = await request(app)
      .post('/cars')
      .set('Cookie', adminCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistration: '2018-01-01', color: 'black', price: 9000, description: 'nice' })
    expect(draftAdmin.status).toBe(403)
  })

  it('public list returns 200', async () => {
    const res = await request(app).get('/cars').query({ page: 1, pageSize: 5 })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })
})


