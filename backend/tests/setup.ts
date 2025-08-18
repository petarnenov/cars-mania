process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret'
process.env.ACCESS_TOKEN_TTL_SECONDS = process.env.ACCESS_TOKEN_TTL_SECONDS || '900'
process.env.REFRESH_TOKEN_TTL_SECONDS = process.env.REFRESH_TOKEN_TTL_SECONDS || '1209600'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./unit-test.db'

// Ensure the SQLite schema is created before tests run
try {
  const { execSync } = await import('node:child_process')
  execSync('npx prisma db push --skip-generate --schema=prisma/schema.prisma', {
    cwd: process.cwd(),
    stdio: 'ignore',
    env: { ...process.env },
  })
} catch {}


