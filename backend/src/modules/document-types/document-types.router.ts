// src/modules/document-types/document-types.router.ts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest } from '../../common/guards/auth.guard';

const router = Router();
router.use(authGuard);

const FILE_TYPES = ['pdf','xlsx','xls','docx','doc','png','jpg','jpeg','zip','eml','msg','txt','csv','json'];

const schema = z.object({
  name:            z.string().min(2),
  code:            z.string().min(1).max(30),
  category:        z.string(),
  description:     z.string().optional(),
  defaultRequired: z.boolean().default(false),
  allowedFileTypes:z.array(z.string()).default(FILE_TYPES),
  maxFileSizeMb:   z.number().int().min(1).max(500).default(100),
  retentionMonths: z.number().int().min(1).default(84),
  isActive:        z.boolean().default(true),
});

router.get('/', async (req: AuthRequest, res) => {
  const { category } = req.query;
  const items = await prisma.documentType.findMany({
    where: { companyId: req.user!.companyId, ...(category ? { category: category as string } : {}) },
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  res.json({ items, grouped });
});

router.get('/:id', async (req: AuthRequest, res) => {
  const item = await prisma.documentType.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId } });
  res.json(item);
});

router.post('/', async (req: AuthRequest, res) => {
  const data = schema.parse(req.body);
  const item = await prisma.documentType.create({ data: { ...data, companyId: req.user!.companyId, createdById: req.user!.id } as any });
  res.status(201).json(item);
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const data = schema.partial().parse(req.body);
  await prisma.documentType.updateMany({ where: { id: req.params.id, companyId: req.user!.companyId }, data });
  res.json({ ok: true });
});

export default router;
