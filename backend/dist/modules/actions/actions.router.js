"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/actions/actions.router.ts
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
// GET /api/actions — all actions with filters
router.get('/', async (req, res) => {
    const { status, overdue, auditId } = req.query;
    const now = new Date();
    const where = { companyId: req.user.companyId };
    if (status)
        where.status = status;
    if (auditId)
        where.auditItem = { auditId };
    if (overdue === 'true') {
        where.dueDate = { lt: now };
        where.status = { notIn: ['TAMAMLANDI', 'IPTAL'] };
    }
    const actions = await prisma_1.default.correctiveAction.findMany({
        where,
        include: {
            auditItem: { select: { auditArea: true, controlSubject: true, compliance: true, riskLevel: true, audit: { select: { periodMonth: true, periodYear: true, subcontractor: { select: { name: true } } } } } },
            finding: { select: { title: true, severity: true } },
            assignedTo: { select: { name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(actions);
});
// PATCH /api/actions/:id
router.patch('/:id', async (req, res) => {
    const schema = zod_1.z.object({
        status: zod_1.z.enum(['ACIK', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'GECIKTI', 'IPTAL']).optional(),
        closureNote: zod_1.z.string().nullable().optional(),
        responsiblePerson: zod_1.z.string().nullable().optional(),
        dueDate: zod_1.z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const action = await prisma_1.default.correctiveAction.update({
        where: { id: req.params.id },
        data: {
            ...data,
            dueDate: data.dueDate ? new Date(data.dueDate) : (data.dueDate === null ? null : undefined),
            closedAt: data.status === 'TAMAMLANDI' ? new Date() : undefined,
        },
    });
    res.json(action);
});
exports.default = router;
//# sourceMappingURL=actions.router.js.map