import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireUser, type AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, unique + ext);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type'));
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Upload up to 3 images and attach to a car
router.post('/cars/:id/images', requireAuth, requireUser, upload.array('images', 3), async (req: AuthenticatedRequest, res) => {
  const car = await prisma.car.findUnique({ where: { id: req.params.id as string }, include: { images: true } });
  if (!car || car.ownerId !== req.user!.id) return res.status(404).json({ error: 'Not found' });
  if ((car.images?.length || 0) + (req.files as Express.Multer.File[]).length > 3) {
    return res.status(400).json({ error: 'Max 3 images' });
  }
  const created = await prisma.$transaction(
    (req.files as Express.Multer.File[]).map((f, idx) =>
      prisma.carImage.create({ data: { carId: car.id, url: `/uploads/${path.basename(f.path)}`, sortOrder: (car.images?.length || 0) + idx } })
    )
  );
  return res.status(201).json(created);
});

export default router;


