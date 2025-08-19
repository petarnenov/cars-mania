import { prisma } from '../src/lib/prisma'
import argon2 from 'argon2'

async function main() {
  const adminEmail = 'admin@demo.test'
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: { email: adminEmail, passwordHash: await argon2.hash('123456'), role: 'ADMIN', name: 'Admin' },
  })

  const sellerEmail = 'seller@demo.test'
  const seller = await prisma.user.upsert({
    where: { email: sellerEmail },
    update: {},
    create: { email: sellerEmail, passwordHash: await argon2.hash('123456'), role: 'USER', name: 'Seller' },
  })

  // create some verified cars
  const carsData = Array.from({ length: 10 }).map((_, i) => ({
    ownerId: seller.id,
    brand: i % 2 === 0 ? 'DemoBrand' : 'SampleBrand',
    model: `Model ${i + 1}`,
    firstRegistrationDate: new Date(2018 + (i % 6), 0, 1),
    color: ['Red', 'Blue', 'Black', 'White'][i % 4],
    priceCents: 500000 + i * 10000,
    description: 'Seeded demo car',
    status: 'VERIFIED' as const,
  }))

  for (const data of carsData) {
    await prisma.car.upsert({
      where: { id: `seed-${data.brand}-${data.model}` },
      update: {},
      create: { ...data },
    }).catch(async () => {
      // fallback: create without deterministic id
      await prisma.car.create({ data })
    })
  }

  console.log('Seed complete:', { adminEmail, sellerEmail, cars: carsData.length })
}

main().finally(async () => {
  await prisma.$disconnect()
})


