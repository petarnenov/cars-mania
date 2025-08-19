import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app'

const baseEnv = {
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '1209600',
};

async function register(email: string) {
  const res = await request(app).post('/api/auth/register').send({ email, password: '123456', name: 'T' })
  const ck = res.get('set-cookie')
  return Array.isArray(ck) ? ck : ck ? [ck] : []
}

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: '123456' })
  const ck = res.get('set-cookie')
  return Array.isArray(ck) ? ck : ck ? [ck] : []
}

async function createVerifiedCar(sellerCk: string[], adminCk: string[]) {
  const draft = await request(app)
    .post('/api/cars')
    .set('Cookie', sellerCk)
    .send({ brand: 'BMW', model: '320d', firstRegistrationDate: '2019-05-01', color: 'blue', priceCents: 1500000, description: 'great' })
  expect(draft.status).toBe(201)
  const carId = draft.body.id as string
  const submitted = await request(app).post(`/api/cars/${carId}/submit`).set('Cookie', sellerCk)
  expect(submitted.ok).toBeTruthy()
  const verified = await request(app).post(`/api/cars/admin/${carId}/verify`).set('Cookie', adminCk)
  expect(verified.ok).toBeTruthy()
  return carId
}

describe('messaging', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });

  it('buyer can message verified car, owner cannot, and messages are retrievable', async () => {
    const sellerEmail = `seller_${Date.now()}@ex.com`
    const buyerEmail = `buyer_${Date.now()}@ex.com`
    const adminEmail = `admin_${Date.now()}@ex.com`

    const sellerCk = await register(sellerEmail)
    await register(buyerEmail)
    await register(adminEmail)
    // promote admin and login to get fresh admin cookie
    await request(app).post('/api/test/make-admin').send({ email: adminEmail })
    const adminCk = await login(adminEmail)

    const carId = await createVerifiedCar(sellerCk, adminCk)

    // owner cannot message own ad
    const ownerMsg = await request(app).post(`/api/cars/${carId}/message`).set('Cookie', sellerCk).send({ body: 'hi' })
    expect(ownerMsg.status).toBe(400)

    // buyer messages
    const buyerCk = await login(buyerEmail)
    const firstMsg = await request(app).post(`/api/cars/${carId}/message`).set('Cookie', buyerCk).send({ body: 'Still available?' })
    expect(firstMsg.status).toBe(201)
    const conversationId = firstMsg.body.conversationId as string
    expect(conversationId).toBeTruthy()

    // lists
    const buyerConvos = await request(app).get('/api/me/conversations').set('Cookie', buyerCk)
    expect(buyerConvos.status).toBe(200)
    expect(buyerConvos.body.items.length).toBeGreaterThan(0)

    const sellerConvos = await request(app).get('/api/me/conversations').set('Cookie', sellerCk)
    expect(sellerConvos.status).toBe(200)
    expect(sellerConvos.body.items.length).toBeGreaterThan(0)

    // messages list
    const buyerMsgs = await request(app).get(`/api/me/conversations/${conversationId}/messages`).set('Cookie', buyerCk)
    expect(buyerMsgs.status).toBe(200)
    expect(buyerMsgs.body.items.length).toBe(1)

    // reply
    const sellerMsgs = await request(app)
      .post(`/api/me/conversations/${conversationId}/messages`)
      .set('Cookie', sellerCk)
      .send({ body: 'Yes' })
    expect(sellerMsgs.status).toBe(201)
  })

  it('message with invalid data returns 400', async () => {
    const sellerEmail = `seller_${Date.now()}@ex.com`
    const buyerEmail = `buyer_${Date.now()}@ex.com`
    const adminEmail = `admin_${Date.now()}@ex.com`

    const sellerCk = await register(sellerEmail)
    await register(buyerEmail)
    await register(adminEmail)
    await request(app).post('/api/test/make-admin').send({ email: adminEmail })
    const adminCk = await login(adminEmail)

    // Create car manually to avoid the createVerifiedCar function issue
    const draft = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCk)
      .send({ brand: 'BMW', model: '320d', firstRegistrationDate: '2019-05-01', color: 'blue', priceCents: 1500000, description: 'great' })
    expect(draft.status).toBe(201)
    
    const carId = draft.body.id
    const submitted = await request(app).post(`/api/cars/${carId}/submit`).set('Cookie', sellerCk)
    expect(submitted.ok).toBeTruthy()
    
    const verified = await request(app).post(`/api/cars/admin/${carId}/verify`).set('Cookie', adminCk)
    expect(verified.ok).toBeTruthy()

    const buyerCk = await login(buyerEmail)

    const res = await request(app)
      .post(`/api/cars/${carId}/message`)
      .set('Cookie', buyerCk)
      .send({ body: '' })
    expect(res.status).toBe(400)
  })

  it('message non-existent car returns 404', async () => {
    const buyerCk = await register(`buyer_${Date.now()}@ex.com`)

    const res = await request(app)
      .post('/api/cars/non-existent-id/message')
      .set('Cookie', buyerCk)
      .send({ body: 'Test message' })
    expect(res.status).toBe(404)
  })

  it('message non-verified car returns 404', async () => {
    const sellerEmail = `seller_${Date.now()}@ex.com`
    const buyerEmail = `buyer_${Date.now()}@ex.com`

    const sellerCk = await register(sellerEmail)
    await register(buyerEmail)

    const draft = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCk)
      .send({ brand: 'BMW', model: '320d', firstRegistrationDate: '2019-05-01', color: 'blue', priceCents: 1500000, description: 'great' })
    
    const buyerCk = await login(buyerEmail)
    const res = await request(app)
      .post(`/api/cars/${draft.body.id}/message`)
      .set('Cookie', buyerCk)
      .send({ body: 'Test message' })
    expect(res.status).toBe(404)
  })

  it('message without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/cars/some-id/message')
      .send({ body: 'Test message' })
    expect(res.status).toBe(401)
  })

  it('get conversations without auth returns 401', async () => {
    const res = await request(app)
      .get('/api/me/conversations')
    expect(res.status).toBe(401)
  })

  it('get messages without auth returns 401', async () => {
    const res = await request(app)
      .get('/api/me/conversations/some-id/messages')
    expect(res.status).toBe(401)
  })

  it('get messages for non-existent conversation returns 404', async () => {
    const userCk = await register(`user_${Date.now()}@ex.com`)

    const res = await request(app)
      .get('/api/me/conversations/non-existent-id/messages')
      .set('Cookie', userCk)
    expect(res.status).toBe(404)
  })

  it('get messages for conversation not owned by user returns 403', async () => {
    const sellerEmail = `seller_${Date.now()}@ex.com`
    const buyerEmail = `buyer_${Date.now()}@ex.com`
    const adminEmail = `admin_${Date.now()}@ex.com`
    const otherEmail = `other_${Date.now()}@ex.com`

    const sellerCk = await register(sellerEmail)
    await register(buyerEmail)
    await register(adminEmail)
    await register(otherEmail)
    await request(app).post('/api/test/make-admin').send({ email: adminEmail })
    const adminCk = await login(adminEmail)

    const carId = await createVerifiedCar(sellerCk, adminCk)
    const buyerCk = await login(buyerEmail)
    const otherCk = await login(otherEmail)

    const firstMsg = await request(app)
      .post(`/api/cars/${carId}/message`)
      .set('Cookie', buyerCk)
      .send({ body: 'Still available?' })
    
    const conversationId = firstMsg.body.conversationId

    const res = await request(app)
      .get(`/api/me/conversations/${conversationId}/messages`)
      .set('Cookie', otherCk)
    expect(res.status).toBe(403)
  })

  it('send message in conversation with invalid data returns 400', async () => {
    const sellerEmail = `seller_${Date.now()}@ex.com`
    const buyerEmail = `buyer_${Date.now()}@ex.com`
    const adminEmail = `admin_${Date.now()}@ex.com`

    const sellerCk = await register(sellerEmail)
    await register(buyerEmail)
    await register(adminEmail)
    await request(app).post('/api/test/make-admin').send({ email: adminEmail })
    const adminCk = await login(adminEmail)

    const carId = await createVerifiedCar(sellerCk, adminCk)
    const buyerCk = await login(buyerEmail)

    const firstMsg = await request(app)
      .post(`/api/cars/${carId}/message`)
      .set('Cookie', buyerCk)
      .send({ body: 'Still available?' })
    
    const conversationId = firstMsg.body.conversationId

    const res = await request(app)
      .post(`/api/me/conversations/${conversationId}/messages`)
      .set('Cookie', sellerCk)
      .send({ body: '' })
    expect(res.status).toBe(400)
  })

  it('send message in non-existent conversation returns 404', async () => {
    const userCk = await register(`user_${Date.now()}@ex.com`)

    const res = await request(app)
      .post('/api/me/conversations/non-existent-id/messages')
      .set('Cookie', userCk)
      .send({ body: 'Test message' })
    expect(res.status).toBe(404)
  })

  it('send message in conversation not owned by user returns 403', async () => {
    const sellerEmail = `seller_${Date.now()}@ex.com`
    const buyerEmail = `buyer_${Date.now()}@ex.com`
    const adminEmail = `admin_${Date.now()}@ex.com`
    const otherEmail = `other_${Date.now()}@ex.com`

    const sellerCk = await register(sellerEmail)
    await register(buyerEmail)
    await register(adminEmail)
    await register(otherEmail)
    await request(app).post('/api/test/make-admin').send({ email: adminEmail })
    const adminCk = await login(adminEmail)

    const carId = await createVerifiedCar(sellerCk, adminCk)
    const buyerCk = await login(buyerEmail)
    const otherCk = await login(otherEmail)

    const firstMsg = await request(app)
      .post(`/api/cars/${carId}/message`)
      .set('Cookie', buyerCk)
      .send({ body: 'Still available?' })
    
    const conversationId = firstMsg.body.conversationId

    const res = await request(app)
      .post(`/api/me/conversations/${conversationId}/messages`)
      .set('Cookie', otherCk)
      .send({ body: 'Test message' })
    expect(res.status).toBe(403)
  })

  it('send message in conversation without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/me/conversations/some-id/messages')
      .send({ body: 'Test message' })
    expect(res.status).toBe(401)
  })
})


