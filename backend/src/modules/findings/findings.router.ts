// src/modules/findings/findings.router.ts v3.1 — full CRUD
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest, assertTenant } from '../../common/guards/auth.guard';

const router = Router();
router.use(authGuard);

// GET /api/findings
router.get('/', async (req: AuthRequest, res) => {
  const { subId, auditId, severity, status, area, compliance, hasDoc, page='1', limit='100' } = req.query;
  const p = parseInt(page as string), l = parseInt(limit as string);
  const where: any = { companyId: req.user!.companyId };
  if (auditId) where.auditId = auditId;
  if (severity) where.severity = severity;
  if (status) where.status = status;
  if (subId) where.audit = { subcontractorId: subId };
  if (area) where.auditItem = { auditArea: { contains: area as string, mode: 'insensitive' } };

  const [findings, total] = await Promise.all([
    prisma.finding.findMany({
      where,
      include: {
        audit: { select:{ id:true, periodLabel:true, periodMonth:true, periodYear:true, subcontractor:{ select:{ name:true } } } },
        auditItem: { select:{ auditArea:true, controlSubject:true, compliance:true, riskLevel:true, riskScore:true, responsiblePerson:true, dueDate:true, actionStatus:true,
          evidenceFiles:{ where:{ status:'active' }, select:{ id:true } } } },
        correctiveActions: { include:{ assignedTo:{ select:{ name:true } } } },
      },
      orderBy: [{ severity:'desc' }, { createdAt:'desc' }],
      skip: (p-1)*l, take: l,
    }),
    prisma.finding.count({ where }),
  ]);

  let result = findings as any[];
  if (hasDoc === 'true')  result = result.filter(f => (f.auditItem?.evidenceFiles?.length ?? 0) > 0);
  if (hasDoc === 'false') result = result.filter(f => (f.auditItem?.evidenceFiles?.length ?? 0) === 0);
  if (compliance) result = result.filter(f => f.auditItem?.compliance === compliance);

  res.json({ findings: result, total, page: p, pages: Math.ceil(total/l) });
});

// GET /api/findings/:id
router.get('/:id', async (req: AuthRequest, res) => {
  const f = await prisma.finding.findFirst({
    where: { id: req.params.id, companyId: req.user!.companyId },
    include: {
      audit: { select:{ id:true, periodLabel:true, subcontractor:{ select:{ name:true } } } },
      auditItem: { select:{ auditArea:true, controlSubject:true, compliance:true, riskLevel:true } },
      correctiveActions: { include:{ assignedTo:{ select:{ name:true } } } },
    },
  });
  if (!f) return res.status(404).json({ message: 'Bulgu bulunamadı' });
  res.json(f);
});

// POST /api/findings
router.post('/', async (req: AuthRequest, res) => {
  const body = z.object({
    auditId: z.string(),
    auditItemId: z.string().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    severity: z.enum(['DUSUK','ORTA','YUKSEK','KRITIK']).default('ORTA'),
    estimatedFinancialImpact: z.number().optional(),
    financialImpactNote: z.string().optional(),
  }).parse(req.body);

  // Check audit belongs to company
  const audit = await prisma.audit.findFirst({ where: { id: body.auditId, companyId: req.user!.companyId } });
  if (!audit) return res.status(404).json({ message: 'Denetim bulunamadı' });

  const f = await prisma.finding.create({
    data: {
      companyId: req.user!.companyId,
      auditId: body.auditId,
      auditItemId: body.auditItemId,
      title: body.title,
      description: body.description,
      severity: body.severity,
      estimatedFinancialImpact: body.estimatedFinancialImpact,
      financialImpactNote: body.financialImpactNote,
    },
  });
  res.status(201).json(f);
});

// PATCH /api/findings/:id
router.patch('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.finding.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId } });
  if (!existing) return res.status(404).json({ message: 'Bulgu bulunamadı' });

  const body = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    severity: z.enum(['DUSUK','ORTA','YUKSEK','KRITIK']).optional(),
    status: z.enum(['ACIK','DEVAM_EDIYOR','TAMAMLANDI','GECIKTI','IPTAL']).optional(),
    estimatedFinancialImpact: z.number().optional().nullable(),
    financialImpactNote: z.string().optional(),
  }).parse(req.body);

  const f = await prisma.finding.update({ where: { id: req.params.id }, data: body });
  res.json(f);
});

// POST /api/findings/:id/actions
router.post('/:id/actions', async (req: AuthRequest, res) => {
  const finding = await prisma.finding.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId } });
  if (!finding) return res.status(404).json({ message: 'Bulgu bulunamadı' });

  const body = z.object({
    actionText: z.string().min(1),
    responsiblePerson: z.string().optional(),
    dueDate: z.string().optional(),
  }).parse(req.body);

  const action = await prisma.correctiveAction.create({
    data: {
      companyId: req.user!.companyId,
      findingId: req.params.id,
      actionText: body.actionText,
      responsiblePerson: body.responsiblePerson,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
  });
  res.status(201).json(action);
});

// DELETE /api/findings/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.finding.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId } });
  if (!existing) return res.status(404).json({ message: 'Bulgu bulunamadı' });
  await prisma.finding.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

export default router;
