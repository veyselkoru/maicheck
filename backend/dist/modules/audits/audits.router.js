"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/audits/audits.router.ts v3.1
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const risk_service_1 = require("../risk/risk.service");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
function buildPeriodLabel(type, pm, py, sm, sy, em, ey) {
    if (type === 'SINGLE' && pm && py)
        return `${MONTHS[pm - 1]} ${py}`;
    if (type === 'RANGE' && sm && sy && em && ey) {
        if (sy === ey && sm === 1 && em === 12)
            return `${sy} Tüm Yıl`;
        return `${MONTHS[sm - 1]} ${sy} – ${MONTHS[em - 1]} ${ey}`;
    }
    return '—';
}
router.get('/', async (req, res) => {
    const { subId, status, periodType } = req.query;
    const audits = await prisma_1.default.audit.findMany({
        where: { companyId: req.user.companyId, ...(subId ? { subcontractorId: subId } : {}), ...(status ? { status: status } : {}), ...(periodType ? { periodType: periodType } : {}) },
        include: { subcontractor: { select: { id: true, name: true } }, template: { select: { id: true, name: true } }, _count: { select: { items: true, findings: true, evidenceFiles: true } } },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    const result = await Promise.all(audits.map(async (a) => {
        const items = await prisma_1.default.auditItem.findMany({ where: { auditId: a.id }, select: { compliance: true, riskLevel: true, riskScore: true, isDocumentRequired: true, dueDate: true, actionStatus: true } });
        return { ...a, stats: (0, risk_service_1.calcAuditStats)(items) };
    }));
    res.json(result);
});
router.get('/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('audit', req.params.id, req.user.companyId);
    const audit = await prisma_1.default.audit.findUnique({
        where: { id: req.params.id },
        include: { subcontractor: true, template: { select: { id: true, name: true } }, items: { orderBy: { orderNo: 'asc' }, include: { evidenceFiles: { where: { status: 'active' } }, requiredDocType: { select: { name: true, code: true } } } } },
    });
    if (!audit)
        throw (0, auth_guard_1.createError)('Denetim bulunamadı', 404);
    const stats = (0, risk_service_1.calcAuditStats)(audit.items);
    const areaStats = (0, risk_service_1.calcAreaStats)(audit.items);
    res.json({ ...audit, stats, areaStats, trafficLight: (0, risk_service_1.getTrafficLight)(stats.totalRisk) });
});
router.post('/', async (req, res) => {
    const schema = zod_1.z.object({
        subcontractorId: zod_1.z.string().uuid(),
        templateId: zod_1.z.string().uuid(),
        periodType: zod_1.z.enum(['SINGLE', 'RANGE']).default('SINGLE'),
        periodMonth: zod_1.z.number().int().min(1).max(12).optional(),
        periodYear: zod_1.z.number().int().min(2020).max(2099).optional(),
        startMonth: zod_1.z.number().int().min(1).max(12).optional(),
        startYear: zod_1.z.number().int().min(2020).max(2099).optional(),
        endMonth: zod_1.z.number().int().min(1).max(12).optional(),
        endYear: zod_1.z.number().int().min(2020).max(2099).optional(),
        auditorName: zod_1.z.string().optional(),
        title: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
    });
    const data = schema.parse(req.body);
    const sub = await prisma_1.default.subcontractor.findFirst({ where: { id: data.subcontractorId, companyId: req.user.companyId } });
    if (!sub)
        throw (0, auth_guard_1.createError)('Alt işveren bulunamadı', 404);
    await (0, auth_guard_1.assertTenant)('template', data.templateId, req.user.companyId);
    const tmpl = await prisma_1.default.auditTemplate.findUnique({ where: { id: data.templateId } });
    if (!tmpl)
        throw (0, auth_guard_1.createError)('Şablon bulunamadı', 404);
    const periodLabel = buildPeriodLabel(data.periodType, data.periodMonth, data.periodYear, data.startMonth, data.startYear, data.endMonth, data.endYear);
    const defaultTitle = data.title || `${sub.name} – ${periodLabel} Denetimi`;
    const audit = await prisma_1.default.audit.create({
        data: {
            companyId: req.user.companyId, subcontractorId: data.subcontractorId, templateId: data.templateId,
            templateSnapshot: JSON.stringify({ name: tmpl.name }),
            periodType: data.periodType,
            periodMonth: data.periodMonth, periodYear: data.periodYear,
            startMonth: data.startMonth, startYear: data.startYear,
            endMonth: data.endMonth, endYear: data.endYear,
            periodLabel,
            status: 'DEVAM_EDIYOR', auditorId: req.user.id, auditorName: data.auditorName || req.user.name,
            title: defaultTitle, notes: data.notes,
        },
    });
    const templateItems = await prisma_1.default.auditTemplateItem.findMany({ where: { templateId: data.templateId, isActive: true }, orderBy: { orderNo: 'asc' }, include: { requiredDocType: { select: { name: true } } } });
    if (templateItems.length > 0) {
        await prisma_1.default.auditItem.createMany({ data: templateItems.map(ti => ({ companyId: req.user.companyId, auditId: audit.id, sourceTemplateItemId: ti.id, auditArea: ti.auditArea, controlSubject: ti.controlSubject, legalBasis: ti.legalBasis, requiredDocTypeId: ti.requiredDocTypeId, requiredDocNameSnapshot: ti.requiredDocType?.name || ti.requiredDocNameNote, isDocumentRequired: ti.isDocumentRequired, isCritical: ti.isCritical, orderNo: ti.orderNo, riskLevel: ti.defaultRiskLevel })) });
    }
    await prisma_1.default.auditLog.create({ data: { companyId: req.user.companyId, userId: req.user.id, entityType: 'Audit', entityId: audit.id, action: 'CREATE', auditId: audit.id, newValue: { title: defaultTitle, periodLabel } } });
    const full = await prisma_1.default.audit.findUnique({ where: { id: audit.id }, include: { subcontractor: true, template: { select: { name: true } }, _count: { select: { items: true } } } });
    res.status(201).json(full);
});
router.patch('/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('audit', req.params.id, req.user.companyId);
    const audit = await prisma_1.default.audit.findUnique({ where: { id: req.params.id } });
    if (audit?.isLocked)
        throw (0, auth_guard_1.createError)('Denetim kilitlidir. Değişiklik yapmak için revizyon oluşturun.');
    const schema = zod_1.z.object({ status: zod_1.z.enum(['BEKLIYOR', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'IPTAL']).optional(), notes: zod_1.z.string().nullable().optional(), auditorName: zod_1.z.string().optional() });
    const data = schema.parse(req.body);
    const updated = await prisma_1.default.audit.update({ where: { id: req.params.id }, data });
    res.json(updated);
});
// POST /api/audits/:id/lock
router.post('/:id/lock', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('audit', req.params.id, req.user.companyId);
    const audit = await prisma_1.default.audit.findUnique({ where: { id: req.params.id } });
    if (audit?.isLocked)
        throw (0, auth_guard_1.createError)('Denetim zaten kilitli.');
    const updated = await prisma_1.default.audit.update({ where: { id: req.params.id }, data: { isLocked: true, lockedAt: new Date(), lockedById: req.user.id, status: 'KILITLI' } });
    await prisma_1.default.auditLog.create({ data: { companyId: req.user.companyId, userId: req.user.id, entityType: 'Audit', entityId: req.params.id, action: 'LOCK', auditId: req.params.id } });
    res.json(updated);
});
// POST /api/audits/:id/unlock
router.post('/:id/unlock', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('audit', req.params.id, req.user.companyId);
    const updated = await prisma_1.default.audit.update({ where: { id: req.params.id }, data: { isLocked: false, lockedAt: null, lockedById: null, status: 'TAMAMLANDI' } });
    await prisma_1.default.auditLog.create({ data: { companyId: req.user.companyId, userId: req.user.id, entityType: 'Audit', entityId: req.params.id, action: 'UNLOCK', auditId: req.params.id } });
    res.json(updated);
});
router.get('/:id/summary', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('audit', req.params.id, req.user.companyId);
    const audit = await prisma_1.default.audit.findUnique({ where: { id: req.params.id }, include: { subcontractor: true, company: true, template: { select: { name: true } }, items: { orderBy: { orderNo: 'asc' }, include: { evidenceFiles: { where: { status: 'active' }, select: { id: true } } } } } });
    if (!audit)
        throw (0, auth_guard_1.createError)('Denetim bulunamadı', 404);
    const stats = (0, risk_service_1.calcAuditStats)(audit.items);
    const areaStats = (0, risk_service_1.calcAreaStats)(audit.items);
    const tl = (0, risk_service_1.getTrafficLight)(stats.totalRisk);
    const nonCompliant = audit.items.filter(i => i.compliance === 'UYGUN_DEGIL');
    const kismi = audit.items.filter(i => i.compliance === 'KISMI');
    const docMissing = audit.items.filter(i => i.isDocumentRequired && i.evidenceFiles.length === 0);
    res.json({ audit: { id: audit.id, periodLabel: audit.periodLabel, periodType: audit.periodType, status: audit.status, auditorName: audit.auditorName, notes: audit.notes, isLocked: audit.isLocked, templateName: audit.template?.name }, subcontractor: audit.subcontractor, company: audit.company, stats, areaStats, trafficLight: tl, nonCompliant, kismi, docMissing });
});
exports.default = router;
//# sourceMappingURL=audits.router.js.map