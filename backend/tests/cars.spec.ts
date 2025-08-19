import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app'

const baseEnv = {
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '1209600',
};

async function register(email: string, role: 'USER' | 'ADMIN' = 'USER') {
  let res = await request(app).post('/api/auth/register').send({ email, password: '123456', name: 'T' })
  if (res.status !== 201) {
    res = await request(app).post('/api/auth/login').send({ email, password: '123456' })
  }
  let cookieHeader = res.get('set-cookie')
  let cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : []
  if (role === 'ADMIN') {
    await request(app).post('/api/test/make-admin').send({ email })
    const login = await request(app).post('/api/auth/login').send({ email, password: '123456' })
    cookieHeader = login.get('set-cookie')
    cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : []
  }
  return cookies
}

describe('cars routes', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });

  it('USER can create draft, ADMIN cannot', async () => {
    const uniq = `${Date.now()}_${Math.floor(Math.random()*1e6)}`
    const sellerCookies = await register(`seller_${uniq}@ex.com`, 'USER')
    const adminCookies = await register(`admin_${uniq}@ex.com`, 'ADMIN')

    const draftOk = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    expect(draftOk.status).toBe(201)

    const draftAdmin = await request(app)
      .post('/api/cars')
      .set('Cookie', adminCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    expect(draftAdmin.status).toBe(403)
  })

  it('create car with invalid data returns 400', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const res = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: '', model: '', firstRegistrationDate: 'invalid-date', color: '', priceCents: -100, description: '' })
    expect(res.status).toBe(400)
  })

  it('create car without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/cars')
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    expect(res.status).toBe(401)
  })

  it('update car successfully', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    const updateRes = await request(app)
      .put(`/api/cars/${car.body.id}`)
      .set('Cookie', sellerCookies)
      .send({ priceCents: 850000, description: 'updated description' })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.priceCents).toBe(850000)
  })

  it('update car with invalid data returns 400', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    const updateRes = await request(app)
      .put(`/api/cars/${car.body.id}`)
      .set('Cookie', sellerCookies)
      .send({ priceCents: -100, description: '' })
    expect(updateRes.status).toBe(400)
  })

  it('update non-existent car returns 404', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const updateRes = await request(app)
      .put('/api/cars/non-existent-id')
      .set('Cookie', sellerCookies)
      .send({ priceCents: 850000 })
    expect(updateRes.status).toBe(404)
  })

  it('update car owned by another user returns 404', async () => {
    const seller1Cookies = await register(`seller1_${Date.now()}@ex.com`, 'USER')
    const seller2Cookies = await register(`seller2_${Date.now()}@ex.com`, 'USER')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', seller1Cookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    const updateRes = await request(app)
      .put(`/api/cars/${car.body.id}`)
      .set('Cookie', seller2Cookies)
      .send({ priceCents: 850000 })
    expect(updateRes.status).toBe(404)
  })

  it('delete car successfully', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    const deleteRes = await request(app)
      .delete(`/api/cars/${car.body.id}`)
      .set('Cookie', sellerCookies)
    expect(deleteRes.status).toBe(200)
  })

  it('delete non-existent car returns 404', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const deleteRes = await request(app)
      .delete('/api/cars/non-existent-id')
      .set('Cookie', sellerCookies)
    expect(deleteRes.status).toBe(404)
  })

  it('submit car for review', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    const submitRes = await request(app)
      .post(`/api/cars/${car.body.id}/submit`)
      .set('Cookie', sellerCookies)
    expect(submitRes.status).toBe(200)
    expect(submitRes.body.status).toBe('PENDING')
  })

  it('submit non-existent car returns 404', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const submitRes = await request(app)
      .post('/api/cars/non-existent-id/submit')
      .set('Cookie', sellerCookies)
    expect(submitRes.status).toBe(404)
  })

  it('public list returns 200', async () => {
    const res = await request(app).get('/api/cars').query({ page: 1, pageSize: 5 })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('public list with filters', async () => {
    const res = await request(app).get('/api/cars').query({ 
      brand: 'BMW', 
      model: '320', 
      color: 'blue', 
      minPrice: '100000', 
      maxPrice: '2000000',
      fromYear: '2018',
      toYear: '2020',
      sort: 'price_asc'
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('get car by id returns 404 for non-verified car', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    const getRes = await request(app)
      .get(`/api/cars/${car.body.id}`)
    expect(getRes.status).toBe(404)
  })

  it('get non-existent car returns 404', async () => {
    const res = await request(app)
      .get('/api/cars/non-existent-id')
    expect(res.status).toBe(404)
  })

  it('admin list pending cars', async () => {
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')
    
    const res = await request(app)
      .get('/api/cars/admin/list')
      .set('Cookie', adminCookies)
      .query({ status: 'PENDING', page: 1, pageSize: 10 })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('admin list without auth returns 401', async () => {
    const res = await request(app)
      .get('/api/cars/admin/list')
    expect(res.status).toBe(401)
  })

  it('admin list without admin role returns 403', async () => {
    const userCookies = await register(`user_${Date.now()}@ex.com`, 'USER')
    
    const res = await request(app)
      .get('/api/cars/admin/list')
      .set('Cookie', userCookies)
    expect(res.status).toBe(403)
  })

  it('admin verify car', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    await request(app)
      .post(`/api/cars/${car.body.id}/submit`)
      .set('Cookie', sellerCookies)
    
    const verifyRes = await request(app)
      .post(`/api/cars/admin/${car.body.id}/verify`)
      .set('Cookie', adminCookies)
    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.status).toBe('VERIFIED')
  })

  it('admin verify non-existent car returns 404', async () => {
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')
    
    const verifyRes = await request(app)
      .post('/api/cars/admin/non-existent-id/verify')
      .set('Cookie', adminCookies)
    expect(verifyRes.status).toBe(404)
  })

  it('admin reject car', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    await request(app)
      .post(`/api/cars/${car.body.id}/submit`)
      .set('Cookie', sellerCookies)
    
    const rejectRes = await request(app)
      .post(`/api/cars/admin/${car.body.id}/reject`)
      .set('Cookie', adminCookies)
      .send({ reason: 'Inappropriate content' })
    expect(rejectRes.status).toBe(200)
    expect(rejectRes.body.status).toBe('REJECTED')
  })

  it('admin reject non-existent car returns 404', async () => {
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')
    
    const rejectRes = await request(app)
      .post('/api/cars/admin/non-existent-id/reject')
      .set('Cookie', adminCookies)
      .send({ reason: 'Test' })
    expect(rejectRes.status).toBe(404)
  })

  it('submit car with invalid status transition returns 400', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    // Submit for review
    await request(app)
      .post(`/api/cars/${car.body.id}/submit`)
      .set('Cookie', sellerCookies)
    
    // Verify the car
    await request(app)
      .post(`/api/cars/admin/${car.body.id}/verify`)
      .set('Cookie', adminCookies)
    
    // Try to submit a verified car (should fail)
    const submitRes = await request(app)
      .post(`/api/cars/${car.body.id}/submit`)
      .set('Cookie', sellerCookies)
    expect(submitRes.status).toBe(400)
    expect(submitRes.body.error).toBe('Invalid status transition')
  })

  it('update verified car with allowed fields moves back to pending', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    const adminCookies = await register(`admin_${Date.now()}@ex.com`, 'ADMIN')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    // Submit and verify
    await request(app)
      .post(`/api/cars/${car.body.id}/submit`)
      .set('Cookie', sellerCookies)
    
    await request(app)
      .post(`/api/cars/admin/${car.body.id}/verify`)
      .set('Cookie', adminCookies)
    
    // Update with allowed field (priceCents is allowed for verified cars)
    const updateRes = await request(app)
      .put(`/api/cars/${car.body.id}`)
      .set('Cookie', sellerCookies)
      .send({ priceCents: 850000 })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.status).toBe('PENDING')
  })

  it('update car with no changes returns original car', async () => {
    const sellerCookies = await register(`seller_${Date.now()}@ex.com`, 'USER')
    
    const car = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCookies)
      .send({ brand: 'VW', model: 'Golf', firstRegistrationDate: '2018-01-01', color: 'black', priceCents: 900000, description: 'nice' })
    
    const updateRes = await request(app)
      .put(`/api/cars/${car.body.id}`)
      .set('Cookie', sellerCookies)
      .send({}) // No changes
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.id).toBe(car.body.id)
  })

  it('public list with invalid pagination parameters uses defaults', async () => {
    const res = await request(app).get('/api/cars').query({ 
      page: 'invalid', 
      pageSize: 'invalid',
      sort: 'invalid_sort'
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('public list with edge case filters', async () => {
    const res = await request(app).get('/api/cars').query({ 
      minPrice: '0',
      maxPrice: '999999999',
      fromYear: '1900',
      toYear: '2030'
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })
})


