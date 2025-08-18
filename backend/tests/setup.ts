process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret'
process.env.ACCESS_TOKEN_TTL_SECONDS = process.env.ACCESS_TOKEN_TTL_SECONDS || '900'
process.env.REFRESH_TOKEN_TTL_SECONDS = process.env.REFRESH_TOKEN_TTL_SECONDS || '1209600'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./unit-test.db'


