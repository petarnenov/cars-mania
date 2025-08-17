import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

// Start or reuse a conversation for a verified car, and send the first message
router.post('/cars/:id/message', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });
  const { body } = parsed.data;
  const car = await prisma.car.findUnique({ where: { id: req.params.id } });
  if (!car || car.status !== 'VERIFIED') return res.status(404).json({ error: 'Not found' });
  if (car.ownerId === req.user!.id) return res.status(400).json({ error: 'Cannot message your own ad' });
  let convo = await prisma.conversation.findUnique({ where: { carId_buyerId: { carId: car.id, buyerId: req.user!.id } } });
  if (!convo) {
    convo = await prisma.conversation.create({ data: { carId: car.id, buyerId: req.user!.id, sellerId: car.ownerId } });
  }
  const msg = await prisma.message.create({ data: { conversationId: convo.id, senderId: req.user!.id, body } });
  return res.status(201).json({ conversationId: convo.id, messageId: msg.id });
});

// List my conversations
router.get('/me/conversations', requireAuth, async (req: AuthenticatedRequest, res) => {
  const me = req.user!.id;
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: me }, { sellerId: me }] },
    orderBy: { createdAt: 'desc' },
    include: {
      car: { select: { id: true, brand: true, model: true } },
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  const items = await Promise.all(
    convos.map(async (c) => {
      const lastRead = c.buyerId === me ? c.buyerLastReadAt : c.sellerLastReadAt;
      const unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          createdAt: { gt: lastRead || new Date(0) },
          NOT: { senderId: me },
        },
      });
      return {
        id: c.id,
        car: c.car,
        lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
        unread,
      };
    })
  );
  return res.json({ items });
});

// Get messages in a conversation
router.get('/me/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  const convo = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (convo.buyerId !== req.user!.id && convo.sellerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const messages = await prisma.message.findMany({ where: { conversationId: convo.id }, orderBy: { createdAt: 'asc' } });
  // mark read for this viewer
  const field = convo.buyerId === req.user!.id ? 'buyerLastReadAt' : 'sellerLastReadAt';
  await prisma.conversation.update({ where: { id: convo.id }, data: { [field]: new Date() } as any });
  return res.json({ items: messages });
});

// Send a message in a conversation
router.post('/me/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });
  const convo = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (convo.buyerId !== req.user!.id && convo.sellerId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  const msg = await prisma.message.create({ data: { conversationId: convo.id, senderId: req.user!.id, body: parsed.data.body } });
  return res.status(201).json(msg);
});

export default router;


