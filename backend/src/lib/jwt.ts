import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type JwtPayload = { sub: string; role: 'USER' | 'ADMIN' };

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTtlSeconds });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.refreshTtlSeconds });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtAccessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as JwtPayload;
}


