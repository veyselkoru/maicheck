// src/modules/audit-items/audit-items.router.ts v3.1
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest, createError } from '../../common/guards/auth.guard';
import { calcRiskScore } from '../risk/risk.service';

const router = Router();
router.use(authGuard);

router.get('/audit/:auditId', async (req: AuthRequest, res) => {
  const audit = await prisma.audit.findFirst({ where: { id: req.params.auditId, companyId: req.user!.companyId } });
  if (!audit) throw createError('Denetim bulunamadı', 404);
  const { area, compliance, riskLevel } = req.query;
  const items = await prisma.auditItem.findMany({
    where: { auditId: req.params.auditId, ...(area ? { auditArea: area as string } : {}), ...(compliance ? { compliance: compliance as any } : {}), ...(riskLevel ? { riskLevel: riskLevel as any } : {}) },
    orderBy: { orderNo: 'asc' },
    include: { evidenceFiles: { where: { status:'active' }, include: { uploadedBy: { select: { name:true } }, documentType: { select: { name:true, code:true } } } }, requiredDocType: { select: { name:true, code:true } }, correctiveActions: true },
  });
  res.json(items);
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const item = await prisma.auditItem.findFirst({ where: { id: req.params.id }, include: { audit: { select: { companyId:true, id:true, isLocked:true } } } });
  if (!item || item.audit.companyId !== req.user!.companyId) throw createError('Kayıt bulunamadı', 404);
  if (item.audit.isLocked) throw createError('Denetim kilitlidir.');

  const schema = z.object({
    compliance:              z.enum(['UYGUN','KISMI','UYGUN_DEGIL']).nullable().optional(),
    riskLevel:               z.enum(['DUSUK','ORTA','YUKSEK','KRITIK']).nullable().optional(),
    findingText:             z.string().nullable().optional(),
    correctiveActionText:    z.string().nullable().optional(),
    responsiblePerson:       z.string().nullable().optional(),
    dueDate:                 z.string().nullable().optional(),
    actionStatus:            z.enum(['ACIK','DEVAM_EDIYOR','TAMAMLANDI','GECIKTI','IPTAL']).nullable().optional(),
    closureNote:             z.string().nullable().optional(),
    estimatedFinancialImpact:z.number().nullable().optional(),
    financialImpactMethod:   z.string().nullable().optional(),
    financialImpactNote:     z.string().nullable().optional(),
    impactParameterId:       z.string().uuid().nullable().optional(),
    subcontractorNote:       z.string().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const newCompliance = data.compliance !== undefined ? data.compliance : item.compliance;
  const newRiskLevel  = data.riskLevel  !== undefined ? data.riskLevel  : item.riskLevel;
  const hasEvidence   = (await prisma.evidenceFile.count({ where: { auditItemId: req.params.id, status: 'active' } })) > 0;
  const newRiskScore  = calcRiskScore(newCompliance, newRiskLevel, item.isDocumentRequired, !hasEvidence, item.isCritical);

  const updated = await prisma.auditItem.update({
    where: { id: req.params.id },
    data: { ...data, riskScore: newRiskScore, dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined, closedAt: data.actionStatus === 'TAMAMLANDI' ? new Date() : undefined, estimatedFinancialImpact: data.estimatedFinancialImpact as any },
    include: { evidenceFiles: { where: { status:'active' } }, requiredDocType: { select: { name:true } } },
  });

  // Auto-create finding
  if ((newCompliance === 'UYGUN_DEGIL' || newCompliance === 'KISMI') && data.findingText) {
    const existing = await prisma.finding.findFirst({ where: { auditItemId: req.params.id } });
    if (existing) { await prisma.finding.update({ where: { id: existing.id }, data: { description: data.findingText, severity: (newRiskLevel || 'ORTA') as any } }); }
    else { await prisma.finding.create({ data: { companyId: req.user!.companyId, auditId: item.audit.id, auditItemId: req.params.id, severity: (newRiskLevel || 'ORTA') as any, title: data.findingText.substring(0, 80), description: data.findingText, status: 'ACIK' } }); }
  }

  await prisma.auditLog.create({ data: { companyId: req.user!.companyId, userId: req.user!.id, entityType: 'AuditItem', entityId: req.params.id, action: 'UPDATE', auditId: item.audit.id, auditItemId: req.params.id, newValue: { compliance: newCompliance, riskScore: newRiskScore } as any } });

  // Recalc audit risk
  const allItems = await prisma.auditItem.findMany({ where: { auditId: item.audit.id }, select: { riskScore: true } });
  const totalRisk = allItems.reduce((s, i) => s + (i.riskScore ?? 0), 0);
  await prisma.audit.update({ where: { id: item.audit.id }, data: { riskScore: totalRisk, trafficLight: totalRisk <= 25 ? 'green' : totalRisk <= 60 ? 'yellow' : 'red' } });

  res.json(updated);
});

export default router;
