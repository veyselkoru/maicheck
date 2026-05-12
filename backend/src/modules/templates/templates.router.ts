// src/modules/templates/templates.router.ts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest, assertTenant } from '../../common/guards/auth.guard';
import { createError } from '../../common/filters/error.handler';

const router = Router();
router.use(authGuard);

// GET /api/templates
router.get('/', async (req: AuthRequest, res) => {
  const templates = await prisma.auditTemplate.findMany({
    where: { companyId: req.user!.companyId },
    include: { _count: { select: { items: true, audits: true } }, createdBy: { select: { name: true } } },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  res.json(templates);
});

// GET /api/templates/:id
router.get('/:id', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.id, req.user!.companyId);
  const t = await prisma.auditTemplate.findUnique({
    where: { id: req.params.id },
    include: {
      items: { where: { isActive: true }, orderBy: { orderNo: 'asc' }, include: { requiredDocType: { select: { id: true, name: true, code: true } } } },
      createdBy: { select: { name: true } },
      _count: { select: { audits: true } },
    },
  });
  res.json(t);
});

// POST /api/templates
router.post('/', async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(2), description: z.string().optional(), purpose: z.string().optional(), sectorTag: z.string().optional() });
  const data = schema.parse(req.body);
  const t = await prisma.auditTemplate.create({ data: { ...data, companyId: req.user!.companyId, createdById: req.user!.id } as any });
  res.status(201).json(t);
});

// PATCH /api/templates/:id
router.patch('/:id', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.id, req.user!.companyId);
  const schema = z.object({ name: z.string().optional(), description: z.string().nullable().optional(), purpose: z.string().nullable().optional(), sectorTag: z.string().nullable().optional(), isActive: z.boolean().optional() });
  const data = schema.parse(req.body);
  const t = await prisma.auditTemplate.update({ where: { id: req.params.id }, data });
  res.json(t);
});

// POST /api/templates/:id/clone
router.post('/:id/clone', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.id, req.user!.companyId);
  const source = await prisma.auditTemplate.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!source) throw createError('Şablon bulunamadı', 404);
  const newName = (req.body.name as string) || `${source.name} (Kopya)`;
  const clone = await prisma.auditTemplate.create({
    data: { companyId: req.user!.companyId, name: newName, description: source.description, purpose: source.purpose, sectorTag: source.sectorTag, isDefault: false, createdById: req.user!.id } as any,
  });
  if (source.items.length > 0) {
    await prisma.auditTemplateItem.createMany({
      data: source.items.map(item => ({
        companyId: req.user!.companyId, templateId: clone.id,
        auditArea: item.auditArea, controlSubject: item.controlSubject, legalBasis: item.legalBasis,
        requiredDocTypeId: item.requiredDocTypeId, requiredDocNameNote: item.requiredDocNameNote,
        isDocumentRequired: item.isDocumentRequired, defaultRiskLevel: item.defaultRiskLevel,
        defaultRiskScore: item.defaultRiskScore, defaultCorrective: item.defaultCorrective,
        auditNote: item.auditNote, orderNo: item.orderNo, isCritical: item.isCritical, isActive: item.isActive,
      })),
    });
  }
  res.status(201).json({ ...clone, itemCount: source.items.length });
});

// DELETE /api/templates/:id (soft — set inactive)
router.delete('/:id', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.id, req.user!.companyId);
  const t = await prisma.auditTemplate.findUnique({ where: { id: req.params.id } });
  if (t?.isDefault) throw createError('Varsayılan şablon silinemez');
  await prisma.auditTemplate.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ ok: true });
});

// ─── Template Items ───────────────────────────────────────────────────────────

const itemSchema = z.object({
  auditArea:          z.string().min(1),
  controlSubject:     z.string().min(2),
  legalBasis:         z.string().nullable().optional(),
  requiredDocTypeId:  z.string().uuid().nullable().optional(),
  requiredDocNameNote:z.string().nullable().optional(),
  isDocumentRequired: z.boolean().default(false),
  defaultRiskLevel:   z.enum(['DUSUK','ORTA','YUKSEK','KRITIK']).default('ORTA'),
  defaultRiskScore:   z.number().int().min(1).max(5).default(3),
  defaultCorrective:  z.string().nullable().optional(),
  auditNote:          z.string().nullable().optional(),
  orderNo:            z.number().int().default(0),
  isCritical:         z.boolean().default(false),
  isActive:           z.boolean().default(true),
});

// GET /api/templates/:id/items
router.get('/:id/items', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.id, req.user!.companyId);
  const items = await prisma.auditTemplateItem.findMany({
    where: { templateId: req.params.id },
    include: { requiredDocType: { select: { id: true, name: true, code: true, category: true } } },
    orderBy: { orderNo: 'asc' },
  });
  res.json(items);
});

// POST /api/templates/:id/items
router.post('/:id/items', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.id, req.user!.companyId);
  const data = itemSchema.parse(req.body);
  const item = await prisma.auditTemplateItem.create({ data: { ...data, companyId: req.user!.companyId, templateId: req.params.id } as any });
  res.status(201).json(item);
});

// PATCH /api/templates/:tid/items/:id
router.patch('/:tid/items/:id', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.tid, req.user!.companyId);
  const data = itemSchema.partial().parse(req.body);
  const item = await prisma.auditTemplateItem.update({ where: { id: req.params.id }, data });
  res.json(item);
});

// DELETE /api/templates/:tid/items/:id
router.delete('/:tid/items/:id', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.tid, req.user!.companyId);
  await prisma.auditTemplateItem.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ ok: true });
});

// PATCH /api/templates/:id/items/reorder
router.patch('/:id/items/reorder', async (req: AuthRequest, res) => {
  await assertTenant('template', req.params.id, req.user!.companyId);
  const { order } = z.object({ order: z.array(z.object({ id: z.string(), orderNo: z.number() })) }).parse(req.body);
  await Promise.all(order.map(o => prisma.auditTemplateItem.update({ where: { id: o.id }, data: { orderNo: o.orderNo } })));
  res.json({ ok: true });
});

export default router;
