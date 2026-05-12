// src/modules/dashboard/dashboard.router.ts v3.1
import { Router } from 'express';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest } from '../../common/guards/auth.guard';
import { calcAuditStats, calcAreaStats, getTrafficLight } from '../risk/risk.service';

const router = Router();
router.use(authGuard);

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

router.get('/', async (req: AuthRequest, res) => {
  const companyId = req.user!.companyId;
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();

  const [totalSubs, totalAudits, monthAudits, overdueActions] = await Promise.all([
    prisma.subcontractor.count({ where: { companyId, isActive: true } }),
    prisma.audit.count({ where: { companyId } }),
    prisma.audit.findMany({ where: { companyId, OR: [{ periodMonth: cm, periodYear: cy }, { periodType: 'RANGE', startYear: cy }] }, include: { subcontractor: { select: { id:true, name:true } }, _count: { select: { items:true, findings:true } } } }),
    prisma.correctiveAction.count({ where: { companyId, dueDate: { lt: now }, status: { notIn: ['TAMAMLANDI','IPTAL'] } } }),
  ]);

  const allItems = await prisma.auditItem.findMany({ where: { audit: { companyId } }, select: { compliance:true, riskLevel:true, riskScore:true, isDocumentRequired:true, dueDate:true, actionStatus:true, auditArea:true, evidenceFiles: { where: { status:'active' }, select: { id:true } } } });
  const globalStats = calcAuditStats(allItems);
  const globalAreaStats = calcAreaStats(allItems);
  const tl = getTrafficLight(globalStats.totalRisk);

  // Subcontractor performance scores
  const subcontractors = await prisma.subcontractor.findMany({ where: { companyId, isActive: true } });
  const subScores = await Promise.all(subcontractors.map(async sub => {
    const subAudits = await prisma.audit.findMany({ where: { companyId, subcontractorId: sub.id }, orderBy: { createdAt: 'desc' }, take: 3 });
    if (subAudits.length === 0) return { ...sub, score: null, trendAudits: [] };
    const trendAudits = await Promise.all(subAudits.map(async a => {
      const items = await prisma.auditItem.findMany({ where: { auditId: a.id }, select: { compliance:true, riskLevel:true, riskScore:true, isDocumentRequired:true, dueDate:true, actionStatus:true, evidenceFiles:{ where:{ status:'active'}, select:{id:true}} } });
      const s = calcAuditStats(items);
      return { auditId: a.id, periodLabel: a.periodLabel, stats: s, tl: getTrafficLight(s.totalRisk) };
    }));
    const latestStats = trendAudits[0]?.stats;
    const score = latestStats ? Math.max(0, 100 - (latestStats.uygunDegil * 5) - (latestStats.kritikYuksek * 3) - (latestStats.docMissing * 2)) : null;
    return { id: sub.id, name: sub.name, score, trendAudits };
  }));

  const auditSummaries = await Promise.all(monthAudits.map(async a => {
    const items = await prisma.auditItem.findMany({ where: { auditId: a.id }, select: { compliance:true, riskLevel:true, riskScore:true, isDocumentRequired:true, dueDate:true, actionStatus:true, evidenceFiles:{ where:{ status:'active'}, select:{id:true}} } });
    const stats = calcAuditStats(items);
    return { id: a.id, subcontractor: a.subcontractor, periodLabel: a.periodLabel, periodType: a.periodType, status: a.status, isLocked: (a as any).isLocked, stats, trafficLight: getTrafficLight(stats.totalRisk) };
  }));

  res.json({ totalSubcontractors: totalSubs, totalAudits, auditedThisMonth: monthAudits.length, globalStats, globalAreaStats, trafficLight: tl, top5Areas: globalAreaStats.filter(a => a.totalRisk > 0).slice(0, 5), overdueActions, auditSummaries, subScores, currentPeriod: `${MONTHS[cm-1]} ${cy}` });
});

export default router;
