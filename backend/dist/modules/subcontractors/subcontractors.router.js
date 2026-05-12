"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
const schema = zod_1.z.object({
    name: zod_1.z.string().min(2), taxNumber: zod_1.z.string().optional(), sgkSicilNo: zod_1.z.string().optional(),
    contractStart: zod_1.z.string().optional(), contractEnd: zod_1.z.string().optional(),
    workArea: zod_1.z.string().optional(), responsiblePerson: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')), phone: zod_1.z.string().optional(),
});
router.get('/', async (req, res) => {
    const items = await prisma_1.default.subcontractor.findMany({ where: { companyId: req.user.companyId, isActive: true }, include: { _count: { select: { audits: true } } }, orderBy: { name: 'asc' } });
    res.json(items);
});
router.get('/:id', async (req, res) => {
    const item = await prisma_1.default.subcontractor.findFirst({ where: { id: req.params.id, companyId: req.user.companyId }, include: { audits: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }], take: 10, include: { _count: { select: { items: true } } } } } });
    res.json(item);
});
router.post('/', async (req, res) => {
    const data = schema.parse(req.body);
    const item = await prisma_1.default.subcontractor.create({ data: { ...data, contractStart: data.contractStart ? new Date(data.contractStart) : null, contractEnd: data.contractEnd ? new Date(data.contractEnd) : null, email: data.email || null, companyId: req.user.companyId } });
    res.status(201).json(item);
});
router.patch('/:id', async (req, res) => {
    const data = schema.partial().parse(req.body);
    await prisma_1.default.subcontractor.updateMany({ where: { id: req.params.id, companyId: req.user.companyId }, data: { ...data, contractStart: data.contractStart ? new Date(data.contractStart) : undefined, contractEnd: data.contractEnd ? new Date(data.contractEnd) : undefined } });
    res.json({ ok: true });
});
router.delete('/:id', async (req, res) => {
    await prisma_1.default.subcontractor.updateMany({ where: { id: req.params.id, companyId: req.user.companyId }, data: { isActive: false } });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=subcontractors.router.js.map