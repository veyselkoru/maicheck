// src/modules/impact/impact.router.ts v3.1
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest, assertTenant } from '../../common/guards/auth.guard';

const router = Router();
router.use(authGuard);

router.get('/', async (req: AuthRequest, res) => {
  const { institution } = req.query;
  const params = await prisma.impactParameter.findMany({
    where: { companyId: req.user!.companyId, isActive: true, ...(institution ? { institution: institution as any } : {}) },
    include: { createdBy: { select: { name:true } } },
    orderBy: [{ institution: 'asc' }, { name: 'asc' }],
  });
  res.json(params);
});

router.post('/', async (req: AuthRequest, res) => {
  const schema = z.object({
    name:            z.string().min(2),
    institution:     z.enum(['SGK','VERGI','ISKUR','IS_HUKUKU','ISG','DIGER']),
    legalReference:  z.string().optional(),
    method:          z.enum(['SABIT','KISI_BASI','GUN_BASI','BELGE_BASI','ORAN_BAZI','KULLANICI_GIRISI']),
    fixedAmount:     z.number().optional(),
    dailyAmount:     z.number().optional(),
    perPersonAmount: z.number().optional(),
    perDocAmount:    z.number().optional(),
    ratePercent:     z.number().optional(),
    minAmount:       z.number().optional(),
    maxAmount:       z.number().optional(),
    validFrom:       z.string().optional(),
    validTo:         z.string().optional(),
    description:     z.string().optional(),
  });
  const data = schema.parse(req.body);
  const param = await prisma.impactParameter.create({ data: { ...data, companyId: req.user!.companyId, createdById: req.user!.id, validFrom: data.validFrom ? new Date(data.validFrom) : null, validTo: data.validTo ? new Date(data.validTo) : null } as any });
  res.status(201).json(param);
});

router.patch('/:id', async (req: AuthRequest, res) => {
  await assertTenant('impact', req.params.id, req.user!.companyId);
  const schema = z.object({ name:z.string().optional(), description:z.string().optional(), fixedAmount:z.number().nullable().optional(), perPersonAmount:z.number().nullable().optional(), ratePercent:z.number().nullable().optional(), isActive:z.boolean().optional(), validFrom:z.string().nullable().optional(), validTo:z.string().nullable().optional() });
  const data = schema.parse(req.body);
  const updated = await prisma.impactParameter.update({ where: { id: req.params.id }, data: { ...data, validFrom: data.validFrom ? new Date(data.validFrom) : data.validFrom === null ? null : undefined, validTo: data.validTo ? new Date(data.validTo) : data.validTo === null ? null : undefined } });
  res.json(updated);
});

// POST /api/impact/calculate — estimate impact for given item
router.post('/calculate', async (req: AuthRequest, res) => {
  const schema = z.object({ parameterId: z.string().uuid(), personCount: z.number().default(1), dayCount: z.number().default(1), documentCount: z.number().default(1), baseAmount: z.number().default(0) });
  const data = schema.parse(req.body);
  const param = await prisma.impactParameter.findFirst({ where: { id: data.parameterId, companyId: req.user!.companyId } });
  if (!param) { res.status(404).json({ message: 'Parametre bulunamadı' }); return; }

  let estimated: number | null = null;
  const fix = Number(param.fixedAmount ?? 0);
  const pp  = Number(param.perPersonAmount ?? 0);
  const pd  = Number(param.dailyAmount ?? 0);
  const doc = Number(param.perDocAmount ?? 0);
  const rt  = Number(param.ratePercent ?? 0);
  const mn  = Number(param.minAmount ?? 0);
  const mx  = Number(param.maxAmount ?? 0);

  switch (param.method) {
    case 'SABIT':        estimated = fix; break;
    case 'KISI_BASI':    estimated = pp * data.personCount; break;
    case 'GUN_BASI':     estimated = pd * data.dayCount; break;
    case 'BELGE_BASI':   estimated = doc * data.documentCount; break;
    case 'ORAN_BAZI':    estimated = (data.baseAmount * rt) / 100; break;
    case 'KULLANICI_GIRISI': estimated = null; break;
  }

  if (estimated !== null) {
    if (mn > 0 && estimated < mn) estimated = mn;
    if (mx > 0 && estimated > mx) estimated = mx;
  }

  res.json({ parameterId: param.id, parameterName: param.name, institution: param.institution, method: param.method, legalReference: param.legalReference, estimated, note: 'Bu hesaplama tahmini olup kesin ceza miktarı değildir. Mevzuat değişikliklerine göre farklılık gösterebilir.' });
});

export default router;
