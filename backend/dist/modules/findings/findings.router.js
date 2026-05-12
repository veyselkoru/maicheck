"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/findings/findings.router.ts v3.1 — full CRUD
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
// GET /api/findings
router.get('/', async (req, res) => {
    const { subId, auditId, severity, status, area, compliance, hasDoc, page = '1', limit = '100' } = req.query;
    const p = parseInt(page), l = parseInt(limit);
    const where = { companyId: req.user.companyId };
    if (auditId)
        where.auditId = auditId;
    if (severity)
        where.severity = severity;
    if (status)
        where.status = status;
    if (subId)
        where.audit = { subcontractorId: subId };
    if (area)
        where.auditItem = { auditArea: { contains: area, mode: 'insensitive' } };
    const [findings, total] = await Promise.all([
        prisma_1.default.finding.findMany({
            where,
            include: {
                audit: { select: { id: true, periodLabel: true, periodMonth: true, periodYear: true, subcontractor: { select: { name: true } } } },
                auditItem: { select: { auditArea: true, controlSubject: true, compliance: true, riskLevel: true, riskScore: true, responsiblePerson: true, dueDate: true, actionStatus: true,
                        evidenceFiles: { where: { status: 'active' }, select: { id: true } } } },
                correctiveActions: { include: { assignedTo: { select: { name: true } } } },
            },
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
            skip: (p - 1) * l, take: l,
        }),
        prisma_1.default.finding.count({ where }),
    ]);
    let result = findings;
    if (hasDoc === 'true')
        result = result.filter(f => (f.auditItem?.evidenceFiles?.length ?? 0) > 0);
    if (hasDoc === 'false')
        result = result.filter(f => (f.auditItem?.evidenceFiles?.length ?? 0) === 0);
    if (compliance)
        result = result.filter(f => f.auditItem?.compliance === compliance);
    res.json({ findings: result, total, page: p, pages: Math.ceil(total / l) });
});
// GET /api/findings/:id
router.get('/:id', async (req, res) => {
    const f = await prisma_1.default.finding.findFirst({
        where: { id: req.params.id, companyId: req.user.companyId },
        include: {
            audit: { select: { id: true, periodLabel: true, subcontractor: { select: { name: true } } } },
            auditItem: { select: { auditArea: true, controlSubject: true, compliance: true, riskLevel: true } },
            correctiveActions: { include: { assignedTo: { select: { name: true } } } },
        },
    });
    if (!f)
        return res.status(404).json({ message: 'Bulgu bulunamadı' });
    res.json(f);
});
// POST /api/findings
router.post('/', async (req, res) => {
    const body = zod_1.z.object({
        auditId: zod_1.z.string(),
        auditItemId: zod_1.z.string().optional(),
        title: zod_1.z.string().min(1),
        description: zod_1.z.string().optional(),
        severity: zod_1.z.enum(['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK']).default('ORTA'),
        estimatedFinancialImpact: zod_1.z.number().optional(),
        financialImpactNote: zod_1.z.string().optional(),
    }).parse(req.body);
    // Check audit belongs to company
    const audit = await prisma_1.default.audit.findFirst({ where: { id: body.auditId, companyId: req.user.companyId } });
    if (!audit)
        return res.status(404).json({ message: 'Denetim bulunamadı' });
    const f = await prisma_1.default.finding.create({
        data: {
            companyId: req.user.companyId,
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
router.patch('/:id', async (req, res) => {
    const existing = await prisma_1.default.finding.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing)
        return res.status(404).json({ message: 'Bulgu bulunamadı' });
    const body = zod_1.z.object({
        title: zod_1.z.string().min(1).optional(),
        description: zod_1.z.string().optional(),
        severity: zod_1.z.enum(['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK']).optional(),
        status: zod_1.z.enum(['ACIK', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'GECIKTI', 'IPTAL']).optional(),
        estimatedFinancialImpact: zod_1.z.number().optional().nullable(),
        financialImpactNote: zod_1.z.string().optional(),
    }).parse(req.body);
    const f = await prisma_1.default.finding.update({ where: { id: req.params.id }, data: body });
    res.json(f);
});
// POST /api/findings/:id/actions
router.post('/:id/actions', async (req, res) => {
    const finding = await prisma_1.default.finding.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!finding)
        return res.status(404).json({ message: 'Bulgu bulunamadı' });
    const body = zod_1.z.object({
        actionText: zod_1.z.string().min(1),
        responsiblePerson: zod_1.z.string().optional(),
        dueDate: zod_1.z.string().optional(),
    }).parse(req.body);
    const action = await prisma_1.default.correctiveAction.create({
        data: {
            companyId: req.user.companyId,
            findingId: req.params.id,
            actionText: body.actionText,
            responsiblePerson: body.responsiblePerson,
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        },
    });
    res.status(201).json(action);
});
// DELETE /api/findings/:id
router.delete('/:id', async (req, res) => {
    const existing = await prisma_1.default.finding.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing)
        return res.status(404).json({ message: 'Bulgu bulunamadı' });
    await prisma_1.default.finding.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
});
exports.default = router;
//# sourceMappingURL=findings.router.js.map