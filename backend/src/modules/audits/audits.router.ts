// src/modules/audits/audits.router.ts v3.1
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest, assertTenant, createError } from '../../common/guards/auth.guard';
import { calcAuditStats, calcAreaStats, getTrafficLight } from '../risk/risk.service';

const router = Router();
router.use(authGuard);

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

function buildPeriodLabel(type: string, pm?: number|null, py?: number|null, sm?: number|null, sy?: number|null, em?: number|null, ey?: number|null): string {
  if (type === 'SINGLE' && pm && py) return `${MONTHS[pm-1]} ${py}`;
  if (type === 'RANGE' && sm && sy && em && ey) {
    if (sy === ey && sm === 1 && em === 12) return `${sy} Tüm Yıl`;
    return `${MONTHS[sm-1]} ${sy} – ${MONTHS[em-1]} ${ey}`;
  }
  return '—';
}

router.get('/', async (req: AuthRequest, res) => {
  const { subId, status, periodType } = req.query;
  const audits = await prisma.audit.findMany({
    where: { companyId: req.user!.companyId, ...(subId ? { subcontractorId: subId as string } : {}), ...(status ? { status: status as any } : {}), ...(periodType ? { periodType: periodType as any } : {}) },
    include: { subcontractor: { select: { id:true, name:true } }, template: { select: { id:true, name:true } }, _count: { select: { items:true, findings:true, evidenceFiles:true } } },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
  });
  const result = await Promise.all(audits.map(async a => {
    const items = await prisma.auditItem.findMany({ where: { auditId: a.id }, select: { compliance:true, riskLevel:true, riskScore:true, isDocumentRequired:true, dueDate:true, actionStatus:true } });
    return { ...a, stats: calcAuditStats(items) };
  }));
  res.json(result);
});

router.get('/:id', async (req: AuthRequest, res) => {
  await assertTenant('audit', req.params.id, req.user!.companyId);
  const audit = await prisma.audit.findUnique({
    where: { id: req.params.id },
    include: { subcontractor: true, template: { select: { id:true, name:true } }, items: { orderBy: { orderNo: 'asc' }, include: { evidenceFiles: { where: { status: 'active' } }, requiredDocType: { select: { name:true, code:true } } } } },
  });
  if (!audit) throw createError('Denetim bulunamadı', 404);
  const stats = calcAuditStats(audit.items);
  const areaStats = calcAreaStats(audit.items);
  res.json({ ...audit, stats, areaStats, trafficLight: getTrafficLight(stats.totalRisk) });
});

router.post('/', async (req: AuthRequest, res) => {
  const schema = z.object({
    subcontractorId: z.string().uuid(),
    templateId:      z.string().uuid(),
    periodType:      z.enum(['SINGLE','RANGE']).default('SINGLE'),
    periodMonth:     z.number().int().min(1).max(12).optional(),
    periodYear:      z.number().int().min(2020).max(2099).optional(),
    startMonth:      z.number().int().min(1).max(12).optional(),
    startYear:       z.number().int().min(2020).max(2099).optional(),
    endMonth:        z.number().int().min(1).max(12).optional(),
    endYear:         z.number().int().min(2020).max(2099).optional(),
    auditorName:     z.string().optional(),
    title:           z.string().optional(),
    notes:           z.string().optional(),
  });
  const data = schema.parse(req.body);

  const sub = await prisma.subcontractor.findFirst({ where: { id: data.subcontractorId, companyId: req.user!.companyId } });
  if (!sub) throw createError('Alt işveren bulunamadı', 404);
  await assertTenant('template', data.templateId, req.user!.companyId);
  const tmpl = await prisma.auditTemplate.findUnique({ where: { id: data.templateId } });
  if (!tmpl) throw createError('Şablon bulunamadı', 404);

  const periodLabel = buildPeriodLabel(data.periodType, data.periodMonth, data.periodYear, data.startMonth, data.startYear, data.endMonth, data.endYear);
  const defaultTitle = data.title || `${sub.name} – ${periodLabel} Denetimi`;

  const audit = await prisma.audit.create({
    data: {
      companyId: req.user!.companyId, subcontractorId: data.subcontractorId, templateId: data.templateId,
      templateSnapshot: JSON.stringify({ name: tmpl.name }),
      periodType: data.periodType as any,
      periodMonth: data.periodMonth, periodYear: data.periodYear,
      startMonth: data.startMonth, startYear: data.startYear,
      endMonth: data.endMonth, endYear: data.endYear,
      periodLabel,
      status: 'DEVAM_EDIYOR', auditorId: req.user!.id, auditorName: data.auditorName || req.user!.name,
      title: defaultTitle, notes: data.notes,
    },
  });

  const templateItems = await prisma.auditTemplateItem.findMany({ where: { templateId: data.templateId, isActive: true }, orderBy: { orderNo: 'asc' }, include: { requiredDocType: { select: { name:true } } } });
  if (templateItems.length > 0) {
    await prisma.auditItem.createMany({ data: templateItems.map(ti => ({ companyId: req.user!.companyId, auditId: audit.id, sourceTemplateItemId: ti.id, auditArea: ti.auditArea, controlSubject: ti.controlSubject, legalBasis: ti.legalBasis, requiredDocTypeId: ti.requiredDocTypeId, requiredDocNameSnapshot: ti.requiredDocType?.name || ti.requiredDocNameNote, isDocumentRequired: ti.isDocumentRequired, isCritical: ti.isCritical, orderNo: ti.orderNo, riskLevel: ti.defaultRiskLevel })) });
  }

  await prisma.auditLog.create({ data: { companyId: req.user!.companyId, userId: req.user!.id, entityType: 'Audit', entityId: audit.id, action: 'CREATE', auditId: audit.id, newValue: { title: defaultTitle, periodLabel } as any } });
  const full = await prisma.audit.findUnique({ where: { id: audit.id }, include: { subcontractor: true, template: { select: { name:true } }, _count: { select: { items:true } } } });
  res.status(201).json(full);
});

router.patch('/:id', async (req: AuthRequest, res) => {
  await assertTenant('audit', req.params.id, req.user!.companyId);
  const audit = await prisma.audit.findUnique({ where: { id: req.params.id } });
  if (audit?.isLocked) throw createError('Denetim kilitlidir. Değişiklik yapmak için revizyon oluşturun.');
  const schema = z.object({ status: z.enum(['BEKLIYOR','DEVAM_EDIYOR','TAMAMLANDI','IPTAL']).optional(), notes: z.string().nullable().optional(), auditorName: z.string().optional() });
  const data = schema.parse(req.body);
  const updated = await prisma.audit.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// POST /api/audits/:id/lock
router.post('/:id/lock', async (req: AuthRequest, res) => {
  await assertTenant('audit', req.params.id, req.user!.companyId);
  const audit = await prisma.audit.findUnique({ where: { id: req.params.id } });
  if (audit?.isLocked) throw createError('Denetim zaten kilitli.');
  const updated = await prisma.audit.update({ where: { id: req.params.id }, data: { isLocked: true, lockedAt: new Date(), lockedById: req.user!.id, status: 'KILITLI' } });
  await prisma.auditLog.create({ data: { companyId: req.user!.companyId, userId: req.user!.id, entityType: 'Audit', entityId: req.params.id, action: 'LOCK', auditId: req.params.id } });
  res.json(updated);
});

// POST /api/audits/:id/unlock
router.post('/:id/unlock', async (req: AuthRequest, res) => {
  await assertTenant('audit', req.params.id, req.user!.companyId);
  const updated = await prisma.audit.update({ where: { id: req.params.id }, data: { isLocked: false, lockedAt: null, lockedById: null, status: 'TAMAMLANDI' } });
  await prisma.auditLog.create({ data: { companyId: req.user!.companyId, userId: req.user!.id, entityType: 'Audit', entityId: req.params.id, action: 'UNLOCK', auditId: req.params.id } });
  res.json(updated);
});

router.get('/:id/summary', async (req: AuthRequest, res) => {
  await assertTenant('audit', req.params.id, req.user!.companyId);
  const audit = await prisma.audit.findUnique({ where: { id: req.params.id }, include: { subcontractor: true, company: true, template: { select: { name:true } }, items: { orderBy: { orderNo:'asc' }, include: { evidenceFiles: { where: { status:'active' }, select: { id:true } } } } } });
  if (!audit) throw createError('Denetim bulunamadı', 404);
  const stats = calcAuditStats(audit.items);
  const areaStats = calcAreaStats(audit.items);
  const tl = getTrafficLight(stats.totalRisk);
  const nonCompliant = audit.items.filter(i => i.compliance === 'UYGUN_DEGIL');
  const kismi = audit.items.filter(i => i.compliance === 'KISMI');
  const docMissing = audit.items.filter(i => i.isDocumentRequired && i.evidenceFiles.length === 0);
  res.json({ audit: { id: audit.id, periodLabel: audit.periodLabel, periodType: audit.periodType, status: audit.status, auditorName: audit.auditorName, notes: audit.notes, isLocked: audit.isLocked, templateName: (audit.template as any)?.name }, subcontractor: audit.subcontractor, company: audit.company, stats, areaStats, trafficLight: tl, nonCompliant, kismi, docMissing });
});

export default router;
