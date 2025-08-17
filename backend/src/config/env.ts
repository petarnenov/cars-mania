import 'dotenv/config';

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  accessTtlSeconds: Number(requireEnv('ACCESS_TOKEN_TTL_SECONDS', '900')),
  refreshTtlSeconds: Number(requireEnv('REFRESH_TOKEN_TTL_SECONDS', '1209600')),
};


