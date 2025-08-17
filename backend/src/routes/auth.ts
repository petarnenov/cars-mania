import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import argon2 from 'argon2';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
  name: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().min(1).max(100).optional()
    ),
});

router.post('/register', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });
  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name: name ?? null } });
  const access = signAccessToken({ sub: user.id, role: user.role });
  const refresh = signRefreshToken({ sub: user.id, role: user.role });
  setAuthCookies(res, access, refresh);
  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

router.post('/login', async (req, res) => {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const access = signAccessToken({ sub: user.id, role: user.role });
  const refresh = signRefreshToken({ sub: user.id, role: user.role });
  setAuthCookies(res, access, refresh);
  return res.json({ id: user.id, email: user.email, role: user.role });
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const access = signAccessToken({ sub: user.id, role: user.role });
    setAuthCookies(res, access, token);
    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

router.post('/logout', async (_req, res) => {
  res.clearCookie('accessToken', { httpOnly: true, sameSite: 'lax' });
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });
  return res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, role: true } });
  return res.json(me);
});

function setAuthCookies(res: any, access: string, refresh: string) {
  res.cookie('accessToken', access, { httpOnly: true, sameSite: 'lax' });
  res.cookie('refreshToken', refresh, { httpOnly: true, sameSite: 'lax' });
}

export default router;


