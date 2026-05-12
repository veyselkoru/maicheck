"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/companies/companies.router.ts v3.1
const express_1 = require("express");
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
const LOGO_DIR = path_1.default.join(process.cwd(), 'uploads', 'logos');
if (!fs_1.default.existsSync(LOGO_DIR))
    fs_1.default.mkdirSync(LOGO_DIR, { recursive: true });
const logoStorage = multer_1.default.diskStorage({
    destination: (_, __, cb) => cb(null, LOGO_DIR),
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `company_${req.user.companyId}_${Date.now()}${ext}`);
    },
});
const logoUpload = (0, multer_1.default)({
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
        if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(path_1.default.extname(file.originalname).toLowerCase()))
            cb(null, true);
        else
            cb(new Error('Desteklenen formatlar: PNG, JPG, SVG, WEBP'));
    },
});
const subLogoStorage = multer_1.default.diskStorage({
    destination: (_, __, cb) => cb(null, LOGO_DIR),
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const subId = req.params.subId || 'sub';
        cb(null, `sub_${subId}_${Date.now()}${ext}`);
    },
});
const subLogoUpload = (0, multer_1.default)({ storage: subLogoStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_, file, cb) => { if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(path_1.default.extname(file.originalname).toLowerCase()))
        cb(null, true);
    else
        cb(new Error('PNG, JPG, SVG, WEBP')); } });
router.get('/me', async (req, res) => {
    const company = await prisma_1.default.company.findUnique({ where: { id: req.user.companyId } });
    res.json(company);
});
router.patch('/me', (0, auth_guard_1.requireRole)('ADMIN'), async (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string().optional(), address: zod_1.z.string().nullable().optional(), phone: zod_1.z.string().nullable().optional(), email: zod_1.z.string().email().nullable().optional() });
    const data = schema.parse(req.body);
    const updated = await prisma_1.default.company.update({ where: { id: req.user.companyId }, data });
    res.json(updated);
});
// POST /api/companies/me/logo
router.post('/me/logo', (0, auth_guard_1.requireRole)('ADMIN'), logoUpload.single('logo'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'Dosya bulunamadı' });
        return;
    }
    const logoPath = `/uploads/logos/${req.file.filename}`;
    const updated = await prisma_1.default.company.update({ where: { id: req.user.companyId }, data: { logoPath } });
    res.json({ logoPath: updated.logoPath });
});
// POST /api/companies/subcontractor/:subId/logo
router.post('/subcontractor/:subId/logo', subLogoUpload.single('logo'), async (req, res) => {
    const sub = await prisma_1.default.subcontractor.findFirst({ where: { id: req.params.subId, companyId: req.user.companyId } });
    if (!sub) {
        res.status(404).json({ message: 'Alt işveren bulunamadı' });
        return;
    }
    if (!req.file) {
        res.status(400).json({ message: 'Dosya bulunamadı' });
        return;
    }
    const logoPath = `/uploads/logos/${req.file.filename}`;
    const updated = await prisma_1.default.subcontractor.update({ where: { id: req.params.subId }, data: { logoPath } });
    res.json({ logoPath: updated.logoPath });
});
exports.default = router;
//# sourceMappingURL=companies.router.js.map