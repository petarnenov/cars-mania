import { execSync } from 'node:child_process'
import { prisma } from '../src/lib/prisma'
import { beforeAll, afterEach, afterAll } from 'vitest'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret'
process.env.ACCESS_TOKEN_TTL_SECONDS = process.env.ACCESS_TOKEN_TTL_SECONDS || '900'
process.env.REFRESH_TOKEN_TTL_SECONDS = process.env.REFRESH_TOKEN_TTL_SECONDS || '1209600'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./unit-test.db'

// Ensure the SQLite schema is created before tests run
try {
  execSync('npx prisma db push --skip-generate --schema=prisma/schema.prisma', {
    cwd: process.cwd(),
    stdio: 'ignore',
    env: { ...process.env },
  })
} catch {}

// Use the existing Prisma instance for test cleanup

// Global test cleanup function
export async function cleanupDatabase() {
  try {
    await prisma.message.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.car.deleteMany()
    await prisma.user.deleteMany()
  } catch (error) {
    console.error('Database cleanup failed:', error)
  }
}

// Clean up database before all tests
beforeAll(async () => {
  await cleanupDatabase()
})

// Clean up database after each test
afterEach(async () => {
  await cleanupDatabase()
})

// Close Prisma connection after all tests
afterAll(async () => {
  await prisma.$disconnect()
})


