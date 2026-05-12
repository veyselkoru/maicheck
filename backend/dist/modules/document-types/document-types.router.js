"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/document-types/document-types.router.ts
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
const FILE_TYPES = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'zip', 'eml', 'msg', 'txt', 'csv', 'json'];
const schema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    code: zod_1.z.string().min(1).max(30),
    category: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    defaultRequired: zod_1.z.boolean().default(false),
    allowedFileTypes: zod_1.z.array(zod_1.z.string()).default(FILE_TYPES),
    maxFileSizeMb: zod_1.z.number().int().min(1).max(500).default(100),
    retentionMonths: zod_1.z.number().int().min(1).default(84),
    isActive: zod_1.z.boolean().default(true),
});
router.get('/', async (req, res) => {
    const { category } = req.query;
    const items = await prisma_1.default.documentType.findMany({
        where: { companyId: req.user.companyId, ...(category ? { category: category } : {}) },
        include: { createdBy: { select: { name: true } } },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    // Group by category
    const grouped = {};
    for (const item of items) {
        if (!grouped[item.category])
            grouped[item.category] = [];
        grouped[item.category].push(item);
    }
    res.json({ items, grouped });
});
router.get('/:id', async (req, res) => {
    const item = await prisma_1.default.documentType.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    res.json(item);
});
router.post('/', async (req, res) => {
    const data = schema.parse(req.body);
    const item = await prisma_1.default.documentType.create({ data: { ...data, companyId: req.user.companyId, createdById: req.user.id } });
    res.status(201).json(item);
});
router.patch('/:id', async (req, res) => {
    const data = schema.partial().parse(req.body);
    await prisma_1.default.documentType.updateMany({ where: { id: req.params.id, companyId: req.user.companyId }, data });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=document-types.router.js.map