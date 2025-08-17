import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { verifyAccessToken } from '../lib/jwt';

export function useCookies() {
  return cookieParser();
}

export type AuthenticatedRequest = Request & {
  user?: { id: string; role: 'USER' | 'ADMIN' };
};

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken || extractBearer(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  next();
}

export function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'USER') return res.status(403).json({ error: 'Admins cannot manage cars' });
  next();
}

function extractBearer(header?: string) {
  if (!header) return undefined;
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer') return undefined;
  return token;
}


