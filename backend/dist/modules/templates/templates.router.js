"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/templates/templates.router.ts
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const error_handler_1 = require("../../common/filters/error.handler");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
// GET /api/templates
router.get('/', async (req, res) => {
    const templates = await prisma_1.default.auditTemplate.findMany({
        where: { companyId: req.user.companyId },
        include: { _count: { select: { items: true, audits: true } }, createdBy: { select: { name: true } } },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    res.json(templates);
});
// GET /api/templates/:id
router.get('/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.id, req.user.companyId);
    const t = await prisma_1.default.auditTemplate.findUnique({
        where: { id: req.params.id },
        include: {
            items: { where: { isActive: true }, orderBy: { orderNo: 'asc' }, include: { requiredDocType: { select: { id: true, name: true, code: true } } } },
            createdBy: { select: { name: true } },
            _count: { select: { audits: true } },
        },
    });
    res.json(t);
});
// POST /api/templates
router.post('/', async (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string().min(2), description: zod_1.z.string().optional(), purpose: zod_1.z.string().optional(), sectorTag: zod_1.z.string().optional() });
    const data = schema.parse(req.body);
    const t = await prisma_1.default.auditTemplate.create({ data: { ...data, companyId: req.user.companyId, createdById: req.user.id } });
    res.status(201).json(t);
});
// PATCH /api/templates/:id
router.patch('/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.id, req.user.companyId);
    const schema = zod_1.z.object({ name: zod_1.z.string().optional(), description: zod_1.z.string().nullable().optional(), purpose: zod_1.z.string().nullable().optional(), sectorTag: zod_1.z.string().nullable().optional(), isActive: zod_1.z.boolean().optional() });
    const data = schema.parse(req.body);
    const t = await prisma_1.default.auditTemplate.update({ where: { id: req.params.id }, data });
    res.json(t);
});
// POST /api/templates/:id/clone
router.post('/:id/clone', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.id, req.user.companyId);
    const source = await prisma_1.default.auditTemplate.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!source)
        throw (0, error_handler_1.createError)('Şablon bulunamadı', 404);
    const newName = req.body.name || `${source.name} (Kopya)`;
    const clone = await prisma_1.default.auditTemplate.create({
        data: { companyId: req.user.companyId, name: newName, description: source.description, purpose: source.purpose, sectorTag: source.sectorTag, isDefault: false, createdById: req.user.id },
    });
    if (source.items.length > 0) {
        await prisma_1.default.auditTemplateItem.createMany({
            data: source.items.map(item => ({
                companyId: req.user.companyId, templateId: clone.id,
                auditArea: item.auditArea, controlSubject: item.controlSubject, legalBasis: item.legalBasis,
                requiredDocTypeId: item.requiredDocTypeId, requiredDocNameNote: item.requiredDocNameNote,
                isDocumentRequired: item.isDocumentRequired, defaultRiskLevel: item.defaultRiskLevel,
                defaultRiskScore: item.defaultRiskScore, defaultCorrective: item.defaultCorrective,
                auditNote: item.auditNote, orderNo: item.orderNo, isCritical: item.isCritical, isActive: item.isActive,
            })),
        });
    }
    res.status(201).json({ ...clone, itemCount: source.items.length });
});
// DELETE /api/templates/:id (soft — set inactive)
router.delete('/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.id, req.user.companyId);
    const t = await prisma_1.default.auditTemplate.findUnique({ where: { id: req.params.id } });
    if (t?.isDefault)
        throw (0, error_handler_1.createError)('Varsayılan şablon silinemez');
    await prisma_1.default.auditTemplate.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
});
// ─── Template Items ───────────────────────────────────────────────────────────
const itemSchema = zod_1.z.object({
    auditArea: zod_1.z.string().min(1),
    controlSubject: zod_1.z.string().min(2),
    legalBasis: zod_1.z.string().nullable().optional(),
    requiredDocTypeId: zod_1.z.string().uuid().nullable().optional(),
    requiredDocNameNote: zod_1.z.string().nullable().optional(),
    isDocumentRequired: zod_1.z.boolean().default(false),
    defaultRiskLevel: zod_1.z.enum(['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK']).default('ORTA'),
    defaultRiskScore: zod_1.z.number().int().min(1).max(5).default(3),
    defaultCorrective: zod_1.z.string().nullable().optional(),
    auditNote: zod_1.z.string().nullable().optional(),
    orderNo: zod_1.z.number().int().default(0),
    isCritical: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
// GET /api/templates/:id/items
router.get('/:id/items', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.id, req.user.companyId);
    const items = await prisma_1.default.auditTemplateItem.findMany({
        where: { templateId: req.params.id },
        include: { requiredDocType: { select: { id: true, name: true, code: true, category: true } } },
        orderBy: { orderNo: 'asc' },
    });
    res.json(items);
});
// POST /api/templates/:id/items
router.post('/:id/items', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.id, req.user.companyId);
    const data = itemSchema.parse(req.body);
    const item = await prisma_1.default.auditTemplateItem.create({ data: { ...data, companyId: req.user.companyId, templateId: req.params.id } });
    res.status(201).json(item);
});
// PATCH /api/templates/:tid/items/:id
router.patch('/:tid/items/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.tid, req.user.companyId);
    const data = itemSchema.partial().parse(req.body);
    const item = await prisma_1.default.auditTemplateItem.update({ where: { id: req.params.id }, data });
    res.json(item);
});
// DELETE /api/templates/:tid/items/:id
router.delete('/:tid/items/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.tid, req.user.companyId);
    await prisma_1.default.auditTemplateItem.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
});
// PATCH /api/templates/:id/items/reorder
router.patch('/:id/items/reorder', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('template', req.params.id, req.user.companyId);
    const { order } = zod_1.z.object({ order: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string(), orderNo: zod_1.z.number() })) }).parse(req.body);
    await Promise.all(order.map(o => prisma_1.default.auditTemplateItem.update({ where: { id: o.id }, data: { orderNo: o.orderNo } })));
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=templates.router.js.map