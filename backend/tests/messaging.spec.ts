import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app'

async function register(email: string) {
  const res = await request(app).post('/auth/register').send({ email, password: '123456', name: 'T' })
  const ck = res.get('set-cookie')
  return Array.isArray(ck) ? ck : ck ? [ck] : []
}

async function login(email: string) {
  const res = await request(app).post('/auth/login').send({ email, password: '123456' })
  const ck = res.get('set-cookie')
  return Array.isArray(ck) ? ck : ck ? [ck] : []
}

async function createVerifiedCar(sellerCk: string[], adminCk: string[]) {
  const draft = await request(app)
    .post('/cars')
    .set('Cookie', sellerCk)
    .send({ brand: 'BMW', model: '320d', firstRegistrationDate: '2019-05-01', color: 'blue', priceCents: 1500000, description: 'great' })
  expect(draft.status).toBe(201)
  const carId = draft.body.id as string
  const submitted = await request(app).post(`/cars/${carId}/submit`).set('Cookie', sellerCk)
  expect(submitted.ok).toBeTruthy()
  const verified = await request(app).post(`/cars/admin/${carId}/verify`).set('Cookie', adminCk)
  expect(verified.ok).toBeTruthy()
  return carId
}

describe('messaging', () => {
  it('buyer can message verified car, owner cannot, and messages are retrievable', async () => {
    const sellerEmail = `seller_${Date.now()}@ex.com`
    const buyerEmail = `buyer_${Date.now()}@ex.com`
    const adminEmail = `admin_${Date.now()}@ex.com`

    const sellerCk = await register(sellerEmail)
    await register(buyerEmail)
    await register(adminEmail)
    // promote admin and login to get fresh admin cookie
    await request(app).post('/test/make-admin').send({ email: adminEmail })
    const adminCk = await login(adminEmail)

    const carId = await createVerifiedCar(sellerCk, adminCk)

    // owner cannot message own ad
    const ownerMsg = await request(app).post(`/cars/${carId}/message`).set('Cookie', sellerCk).send({ body: 'hi' })
    expect(ownerMsg.status).toBe(400)

    // buyer messages
    const buyerCk = await login(buyerEmail)
    const firstMsg = await request(app).post(`/cars/${carId}/message`).set('Cookie', buyerCk).send({ body: 'Still available?' })
    expect(firstMsg.status).toBe(201)
    const conversationId = firstMsg.body.conversationId as string
    expect(conversationId).toBeTruthy()

    // lists
    const buyerConvos = await request(app).get('/me/conversations').set('Cookie', buyerCk)
    expect(buyerConvos.status).toBe(200)
    expect(buyerConvos.body.items.length).toBeGreaterThan(0)

    const sellerConvos = await request(app).get('/me/conversations').set('Cookie', sellerCk)
    expect(sellerConvos.status).toBe(200)
    expect(sellerConvos.body.items.length).toBeGreaterThan(0)

    // messages list
    const buyerMsgs = await request(app).get(`/me/conversations/${conversationId}/messages`).set('Cookie', buyerCk)
    expect(buyerMsgs.status).toBe(200)
    expect(buyerMsgs.body.items.length).toBe(1)

    // reply
    const sellerMsgs = await request(app)
      .post(`/me/conversations/${conversationId}/messages`)
      .set('Cookie', sellerCk)
      .send({ body: 'Yes' })
    expect(sellerMsgs.status).toBe(201)
  })
})


