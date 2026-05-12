"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/impact/impact.router.ts v3.1
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
router.get('/', async (req, res) => {
    const { institution } = req.query;
    const params = await prisma_1.default.impactParameter.findMany({
        where: { companyId: req.user.companyId, isActive: true, ...(institution ? { institution: institution } : {}) },
        include: { createdBy: { select: { name: true } } },
        orderBy: [{ institution: 'asc' }, { name: 'asc' }],
    });
    res.json(params);
});
router.post('/', async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(2),
        institution: zod_1.z.enum(['SGK', 'VERGI', 'ISKUR', 'IS_HUKUKU', 'ISG', 'DIGER']),
        legalReference: zod_1.z.string().optional(),
        method: zod_1.z.enum(['SABIT', 'KISI_BASI', 'GUN_BASI', 'BELGE_BASI', 'ORAN_BAZI', 'KULLANICI_GIRISI']),
        fixedAmount: zod_1.z.number().optional(),
        dailyAmount: zod_1.z.number().optional(),
        perPersonAmount: zod_1.z.number().optional(),
        perDocAmount: zod_1.z.number().optional(),
        ratePercent: zod_1.z.number().optional(),
        minAmount: zod_1.z.number().optional(),
        maxAmount: zod_1.z.number().optional(),
        validFrom: zod_1.z.string().optional(),
        validTo: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
    });
    const data = schema.parse(req.body);
    const param = await prisma_1.default.impactParameter.create({ data: { ...data, companyId: req.user.companyId, createdById: req.user.id, validFrom: data.validFrom ? new Date(data.validFrom) : null, validTo: data.validTo ? new Date(data.validTo) : null } });
    res.status(201).json(param);
});
router.patch('/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('impact', req.params.id, req.user.companyId);
    const schema = zod_1.z.object({ name: zod_1.z.string().optional(), description: zod_1.z.string().optional(), fixedAmount: zod_1.z.number().nullable().optional(), perPersonAmount: zod_1.z.number().nullable().optional(), ratePercent: zod_1.z.number().nullable().optional(), isActive: zod_1.z.boolean().optional(), validFrom: zod_1.z.string().nullable().optional(), validTo: zod_1.z.string().nullable().optional() });
    const data = schema.parse(req.body);
    const updated = await prisma_1.default.impactParameter.update({ where: { id: req.params.id }, data: { ...data, validFrom: data.validFrom ? new Date(data.validFrom) : data.validFrom === null ? null : undefined, validTo: data.validTo ? new Date(data.validTo) : data.validTo === null ? null : undefined } });
    res.json(updated);
});
// POST /api/impact/calculate — estimate impact for given item
router.post('/calculate', async (req, res) => {
    const schema = zod_1.z.object({ parameterId: zod_1.z.string().uuid(), personCount: zod_1.z.number().default(1), dayCount: zod_1.z.number().default(1), documentCount: zod_1.z.number().default(1), baseAmount: zod_1.z.number().default(0) });
    const data = schema.parse(req.body);
    const param = await prisma_1.default.impactParameter.findFirst({ where: { id: data.parameterId, companyId: req.user.companyId } });
    if (!param) {
        res.status(404).json({ message: 'Parametre bulunamadı' });
        return;
    }
    let estimated = null;
    const fix = Number(param.fixedAmount ?? 0);
    const pp = Number(param.perPersonAmount ?? 0);
    const pd = Number(param.dailyAmount ?? 0);
    const doc = Number(param.perDocAmount ?? 0);
    const rt = Number(param.ratePercent ?? 0);
    const mn = Number(param.minAmount ?? 0);
    const mx = Number(param.maxAmount ?? 0);
    switch (param.method) {
        case 'SABIT':
            estimated = fix;
            break;
        case 'KISI_BASI':
            estimated = pp * data.personCount;
            break;
        case 'GUN_BASI':
            estimated = pd * data.dayCount;
            break;
        case 'BELGE_BASI':
            estimated = doc * data.documentCount;
            break;
        case 'ORAN_BAZI':
            estimated = (data.baseAmount * rt) / 100;
            break;
        case 'KULLANICI_GIRISI':
            estimated = null;
            break;
    }
    if (estimated !== null) {
        if (mn > 0 && estimated < mn)
            estimated = mn;
        if (mx > 0 && estimated > mx)
            estimated = mx;
    }
    res.json({ parameterId: param.id, parameterName: param.name, institution: param.institution, method: param.method, legalReference: param.legalReference, estimated, note: 'Bu hesaplama tahmini olup kesin ceza miktarı değildir. Mevzuat değişikliklerine göre farklılık gösterebilir.' });
});
exports.default = router;
//# sourceMappingURL=impact.router.js.map