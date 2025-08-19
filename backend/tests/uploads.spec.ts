import { describe, it, expect } from 'vitest'
import request from 'supertest'
import fs from 'node:fs'
import path from 'node:path'
import app from '../src/app'

async function register(email: string) {
  const res = await request(app).post('/api/auth/register').send({ email, password: '123456', name: 'T' })
  const ck = res.get('set-cookie')
  return Array.isArray(ck) ? ck : ck ? [ck] : []
}

describe('uploads', () => {
  it('owner can upload up to 3 images, and max constraint enforced', async () => {
    const sellerCk = await register(`uploader_${Date.now()}@ex.com`)
    const draft = await request(app)
      .post('/api/cars')
      .set('Cookie', sellerCk)
      .send({ brand: 'Audi', model: 'A3', firstRegistrationDate: '2020-01-01', color: 'red', priceCents: 1200000, description: 'ok' })
    expect(draft.status).toBe(201)
    const carId = draft.body.id as string

    // create 4 small dummy png buffers
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-upload-'))
    const mkFile = (name: string) => {
      const p = path.join(tmpDir, name)
      fs.writeFileSync(p, Buffer.from([0x89, 0x50, 0x4e, 0x47])) // PNG header bytes
      return p
    }
    const f1 = mkFile('1.png')
    const f2 = mkFile('2.png')
    const f3 = mkFile('3.png')
    const f4 = mkFile('4.png')

    const upOk = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', sellerCk)
      .attach('images', f1)
      .attach('images', f2)
      .attach('images', f3)
    expect(upOk.status).toBe(201)
    expect(Array.isArray(upOk.body)).toBe(true)
    expect(upOk.body.length).toBe(3)

    const upTooMany = await request(app)
      .post(`/api/upload/cars/${carId}/images`)
      .set('Cookie', sellerCk)
      .attach('images', f4)
    expect(upTooMany.status).toBe(400)
  })
})


