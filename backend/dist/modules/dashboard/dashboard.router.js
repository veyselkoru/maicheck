"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/dashboard/dashboard.router.ts v3.1
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const risk_service_1 = require("../risk/risk.service");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
router.get('/', async (req, res) => {
    const companyId = req.user.companyId;
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    const [totalSubs, totalAudits, monthAudits, overdueActions] = await Promise.all([
        prisma_1.default.subcontractor.count({ where: { companyId, isActive: true } }),
        prisma_1.default.audit.count({ where: { companyId } }),
        prisma_1.default.audit.findMany({ where: { companyId, OR: [{ periodMonth: cm, periodYear: cy }, { periodType: 'RANGE', startYear: cy }] }, include: { subcontractor: { select: { id: true, name: true } }, _count: { select: { items: true, findings: true } } } }),
        prisma_1.default.correctiveAction.count({ where: { companyId, dueDate: { lt: now }, status: { notIn: ['TAMAMLANDI', 'IPTAL'] } } }),
    ]);
    const allItems = await prisma_1.default.auditItem.findMany({ where: { audit: { companyId } }, select: { compliance: true, riskLevel: true, riskScore: true, isDocumentRequired: true, dueDate: true, actionStatus: true, auditArea: true, evidenceFiles: { where: { status: 'active' }, select: { id: true } } } });
    const globalStats = (0, risk_service_1.calcAuditStats)(allItems);
    const globalAreaStats = (0, risk_service_1.calcAreaStats)(allItems);
    const tl = (0, risk_service_1.getTrafficLight)(globalStats.totalRisk);
    // Subcontractor performance scores
    const subcontractors = await prisma_1.default.subcontractor.findMany({ where: { companyId, isActive: true } });
    const subScores = await Promise.all(subcontractors.map(async (sub) => {
        const subAudits = await prisma_1.default.audit.findMany({ where: { companyId, subcontractorId: sub.id }, orderBy: { createdAt: 'desc' }, take: 3 });
        if (subAudits.length === 0)
            return { ...sub, score: null, trendAudits: [] };
        const trendAudits = await Promise.all(subAudits.map(async (a) => {
            const items = await prisma_1.default.auditItem.findMany({ where: { auditId: a.id }, select: { compliance: true, riskLevel: true, riskScore: true, isDocumentRequired: true, dueDate: true, actionStatus: true, evidenceFiles: { where: { status: 'active' }, select: { id: true } } } });
            const s = (0, risk_service_1.calcAuditStats)(items);
            return { auditId: a.id, periodLabel: a.periodLabel, stats: s, tl: (0, risk_service_1.getTrafficLight)(s.totalRisk) };
        }));
        const latestStats = trendAudits[0]?.stats;
        const score = latestStats ? Math.max(0, 100 - (latestStats.uygunDegil * 5) - (latestStats.kritikYuksek * 3) - (latestStats.docMissing * 2)) : null;
        return { id: sub.id, name: sub.name, score, trendAudits };
    }));
    const auditSummaries = await Promise.all(monthAudits.map(async (a) => {
        const items = await prisma_1.default.auditItem.findMany({ where: { auditId: a.id }, select: { compliance: true, riskLevel: true, riskScore: true, isDocumentRequired: true, dueDate: true, actionStatus: true, evidenceFiles: { where: { status: 'active' }, select: { id: true } } } });
        const stats = (0, risk_service_1.calcAuditStats)(items);
        return { id: a.id, subcontractor: a.subcontractor, periodLabel: a.periodLabel, periodType: a.periodType, status: a.status, isLocked: a.isLocked, stats, trafficLight: (0, risk_service_1.getTrafficLight)(stats.totalRisk) };
    }));
    res.json({ totalSubcontractors: totalSubs, totalAudits, auditedThisMonth: monthAudits.length, globalStats, globalAreaStats, trafficLight: tl, top5Areas: globalAreaStats.filter(a => a.totalRisk > 0).slice(0, 5), overdueActions, auditSummaries, subScores, currentPeriod: `${MONTHS[cm - 1]} ${cy}` });
});
exports.default = router;
//# sourceMappingURL=dashboard.router.js.map