import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, requireUser, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const createCarSchema = z.object({
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  firstRegistrationDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  color: z.string().trim().min(1).max(50),
  priceCents: z.number().int().min(0),
  description: z.string().trim().min(1).max(5000),
});

const updateCarSchema = createCarSchema.partial();

// Create car (status draft)
router.post('/', requireAuth, requireUser, async (req: AuthenticatedRequest, res) => {
  const parsed = createCarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });
  const data = parsed.data;
  const car = await prisma.car.create({
    data: {
      ownerId: req.user!.id,
      brand: data.brand,
      model: data.model,
      firstRegistrationDate: new Date(data.firstRegistrationDate),
      color: data.color,
      priceCents: data.priceCents,
      description: data.description,
      status: 'DRAFT',
    },
  });
  return res.status(201).json(car);
});

// Update own car (if not verified or only price/description allowed)
router.put('/:id', requireAuth, requireUser, async (req: AuthenticatedRequest, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id as string } });
  if (!car || car.ownerId !== req.user!.id) return res.status(404).json({ error: 'Not found' });

  const parsed = updateCarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });
  const data = parsed.data;

  // If verified, only allow price/description changes and move back to pending
  const isVerified = car.status === 'VERIFIED';
  const allowedFields = isVerified ? ['priceCents', 'description'] : Object.keys(data);
  const updateData: any = {};
  for (const key of Object.keys(data)) {
    if (!allowedFields.includes(key)) continue;
    if (key === 'firstRegistrationDate' && typeof (data as any)[key] === 'string') {
      updateData.firstRegistrationDate = new Date((data as any)[key]);
    } else {
      (updateData as any)[key] = (data as any)[key];
    }
  }
  if (Object.keys(updateData).length === 0) return res.json(car);
  if (isVerified) updateData.status = 'PENDING';

  const updated = await prisma.car.update({ where: { id: car.id }, data: updateData });
  return res.json(updated);
});

// Delete own car
router.delete('/:id', requireAuth, requireUser, async (req: AuthenticatedRequest, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id as string } });
  if (!car || car.ownerId !== req.user!.id) return res.status(404).json({ error: 'Not found' });
  await prisma.car.delete({ where: { id: car.id } });
  return res.json({ ok: true });
});

// Submit for review (draft -> pending)
router.post('/:id/submit', requireAuth, requireUser, async (req: AuthenticatedRequest, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id as string } });
  if (!car || car.ownerId !== req.user!.id) return res.status(404).json({ error: 'Not found' });
  if (car.status !== 'DRAFT' && car.status !== 'REJECTED' && car.status !== 'PENDING') {
    return res.status(400).json({ error: 'Invalid status transition' });
  }
  const updated = await prisma.car.update({ where: { id: car.id }, data: { status: 'PENDING' } });
  return res.json(updated);
});

// Public list of verified cars with filters
router.get('/', async (req, res) => {
  const { brand, model, color, minPrice, maxPrice, fromYear, toYear, page = '1', pageSize = '12', sort = 'newest' } = req.query as Record<string, string>;
  const take = Math.min(Math.max(parseInt(pageSize || '12', 10) || 12, 1), 50);
  const skip = (Math.max(parseInt(page || '1', 10) || 1, 1) - 1) * take;

  const where: any = { status: 'VERIFIED' };
  if (brand) where.brand = { contains: brand, mode: 'insensitive' };
  if (model) where.model = { contains: model, mode: 'insensitive' };
  if (color) where.color = { contains: color, mode: 'insensitive' };
  if (minPrice) where.priceCents = { ...(where.priceCents || {}), gte: Number(minPrice) };
  if (maxPrice) where.priceCents = { ...(where.priceCents || {}), lte: Number(maxPrice) };
  if (fromYear) where.firstRegistrationDate = { ...(where.firstRegistrationDate || {}), gte: new Date(Number(fromYear), 0, 1) };
  if (toYear) where.firstRegistrationDate = { ...(where.firstRegistrationDate || {}), lte: new Date(Number(toYear), 11, 31) };

  const orderBy = sort === 'price_asc' ? { priceCents: 'asc' as const }
    : sort === 'price_desc' ? { priceCents: 'desc' as const }
    : { createdAt: 'desc' as const };

  const [items, total] = await Promise.all([
    prisma.car.findMany({ where, orderBy, skip, take, include: { images: { orderBy: { sortOrder: 'asc' } } } }),
    prisma.car.count({ where }),
  ]);

  return res.json({ items, total, page: Number(page || 1), pageSize: take });
});

// Get car by id (only verified unless owner/admin)
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id as string }, include: { images: { orderBy: { sortOrder: 'asc' } } } });
  if (!car) return res.status(404).json({ error: 'Not found' });
  if (car.status !== 'VERIFIED') return res.status(404).json({ error: 'Not found' });
  return res.json(car);
});

// Admin endpoints for moderation
router.get('/admin/list', requireAuth, requireAdmin, async (req, res) => {
  const { status = 'PENDING', page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const take = Math.min(Math.max(parseInt(pageSize || '20', 10) || 20, 1), 100);
  const skip = (Math.max(parseInt(page || '1', 10) || 1, 1) - 1) * take;
  const where: any = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.car.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { images: true } }),
    prisma.car.count({ where }),
  ]);
  return res.json({ items, total, page: Number(page || 1), pageSize: take });
});

router.post('/admin/:id/verify', requireAuth, requireAdmin, async (req, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id as string } });
  if (!car) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.car.update({ where: { id: car.id }, data: { status: 'VERIFIED' } });
  await prisma.moderationLog.create({ data: { carId: car.id, moderatorId: (req as any).user.id, action: 'verify', reason: null } });
  return res.json(updated);
});

router.post('/admin/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id as string } });
  if (!car) return res.status(404).json({ error: 'Not found' });
  const { reason } = (req.body || {}) as { reason?: string };
  const updated = await prisma.car.update({ where: { id: car.id }, data: { status: 'REJECTED' } });
  await prisma.moderationLog.create({ data: { carId: car.id, moderatorId: (req as any).user.id, action: 'reject', reason: reason ?? null } });
  return res.json(updated);
});

export default router;


