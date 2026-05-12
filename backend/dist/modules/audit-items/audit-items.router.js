"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/audit-items/audit-items.router.ts v3.1
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const risk_service_1 = require("../risk/risk.service");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
router.get('/audit/:auditId', async (req, res) => {
    const audit = await prisma_1.default.audit.findFirst({ where: { id: req.params.auditId, companyId: req.user.companyId } });
    if (!audit)
        throw (0, auth_guard_1.createError)('Denetim bulunamadı', 404);
    const { area, compliance, riskLevel } = req.query;
    const items = await prisma_1.default.auditItem.findMany({
        where: { auditId: req.params.auditId, ...(area ? { auditArea: area } : {}), ...(compliance ? { compliance: compliance } : {}), ...(riskLevel ? { riskLevel: riskLevel } : {}) },
        orderBy: { orderNo: 'asc' },
        include: { evidenceFiles: { where: { status: 'active' }, include: { uploadedBy: { select: { name: true } }, documentType: { select: { name: true, code: true } } } }, requiredDocType: { select: { name: true, code: true } }, correctiveActions: true },
    });
    res.json(items);
});
router.patch('/:id', async (req, res) => {
    const item = await prisma_1.default.auditItem.findFirst({ where: { id: req.params.id }, include: { audit: { select: { companyId: true, id: true, isLocked: true } } } });
    if (!item || item.audit.companyId !== req.user.companyId)
        throw (0, auth_guard_1.createError)('Kayıt bulunamadı', 404);
    if (item.audit.isLocked)
        throw (0, auth_guard_1.createError)('Denetim kilitlidir.');
    const schema = zod_1.z.object({
        compliance: zod_1.z.enum(['UYGUN', 'KISMI', 'UYGUN_DEGIL']).nullable().optional(),
        riskLevel: zod_1.z.enum(['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK']).nullable().optional(),
        findingText: zod_1.z.string().nullable().optional(),
        correctiveActionText: zod_1.z.string().nullable().optional(),
        responsiblePerson: zod_1.z.string().nullable().optional(),
        dueDate: zod_1.z.string().nullable().optional(),
        actionStatus: zod_1.z.enum(['ACIK', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'GECIKTI', 'IPTAL']).nullable().optional(),
        closureNote: zod_1.z.string().nullable().optional(),
        estimatedFinancialImpact: zod_1.z.number().nullable().optional(),
        financialImpactMethod: zod_1.z.string().nullable().optional(),
        financialImpactNote: zod_1.z.string().nullable().optional(),
        impactParameterId: zod_1.z.string().uuid().nullable().optional(),
        subcontractorNote: zod_1.z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const newCompliance = data.compliance !== undefined ? data.compliance : item.compliance;
    const newRiskLevel = data.riskLevel !== undefined ? data.riskLevel : item.riskLevel;
    const hasEvidence = (await prisma_1.default.evidenceFile.count({ where: { auditItemId: req.params.id, status: 'active' } })) > 0;
    const newRiskScore = (0, risk_service_1.calcRiskScore)(newCompliance, newRiskLevel, item.isDocumentRequired, !hasEvidence, item.isCritical);
    const updated = await prisma_1.default.auditItem.update({
        where: { id: req.params.id },
        data: { ...data, riskScore: newRiskScore, dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined, closedAt: data.actionStatus === 'TAMAMLANDI' ? new Date() : undefined, estimatedFinancialImpact: data.estimatedFinancialImpact },
        include: { evidenceFiles: { where: { status: 'active' } }, requiredDocType: { select: { name: true } } },
    });
    // Auto-create finding
    if ((newCompliance === 'UYGUN_DEGIL' || newCompliance === 'KISMI') && data.findingText) {
        const existing = await prisma_1.default.finding.findFirst({ where: { auditItemId: req.params.id } });
        if (existing) {
            await prisma_1.default.finding.update({ where: { id: existing.id }, data: { description: data.findingText, severity: (newRiskLevel || 'ORTA') } });
        }
        else {
            await prisma_1.default.finding.create({ data: { companyId: req.user.companyId, auditId: item.audit.id, auditItemId: req.params.id, severity: (newRiskLevel || 'ORTA'), title: data.findingText.substring(0, 80), description: data.findingText, status: 'ACIK' } });
        }
    }
    await prisma_1.default.auditLog.create({ data: { companyId: req.user.companyId, userId: req.user.id, entityType: 'AuditItem', entityId: req.params.id, action: 'UPDATE', auditId: item.audit.id, auditItemId: req.params.id, newValue: { compliance: newCompliance, riskScore: newRiskScore } } });
    // Recalc audit risk
    const allItems = await prisma_1.default.auditItem.findMany({ where: { auditId: item.audit.id }, select: { riskScore: true } });
    const totalRisk = allItems.reduce((s, i) => s + (i.riskScore ?? 0), 0);
    await prisma_1.default.audit.update({ where: { id: item.audit.id }, data: { riskScore: totalRisk, trafficLight: totalRisk <= 25 ? 'green' : totalRisk <= 60 ? 'yellow' : 'red' } });
    res.json(updated);
});
exports.default = router;
//# sourceMappingURL=audit-items.router.js.map