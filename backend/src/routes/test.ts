import { Router } from 'express';
import { prisma } from '../lib/prisma';
import argon2 from 'argon2';

const router = Router();

router.post('/make-admin', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: 'email required' });
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await argon2.hash('123456');
      user = await prisma.user.create({ data: { email, passwordHash, role: 'ADMIN', name: 'Admin' } });
    } else if (user.role !== 'ADMIN') {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    }
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal error' });
  }
});

export default router;


