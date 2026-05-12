"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/evidence/evidence.router.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const error_handler_1 = require("../../common/filters/error.handler");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
// ─── Storage abstraction (local → S3 ready) ──────────────────────────────────
function getUploadDir() {
    const dir = process.env.UPLOAD_DIR || './uploads';
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    return dir;
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, getUploadDir()),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${crypto_1.default.randomBytes(8).toString('hex')}`;
        cb(null, `${unique}${path_1.default.extname(file.originalname).toLowerCase()}`);
    },
});
const ALLOWED_EXTS = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.zip', '.eml', '.msg', '.txt', '.csv', '.json'];
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '100') * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTS.includes(ext))
            cb(null, true);
        else
            cb(new Error(`Desteklenmeyen dosya türü: ${ext}. İzin verilenler: ${ALLOWED_EXTS.join(', ')}`));
    },
});
function checksum(filePath) {
    const buf = fs_1.default.readFileSync(filePath);
    return crypto_1.default.createHash('sha256').update(buf).digest('hex');
}
// POST /api/evidence/upload — generic upload (auditItemId optional in body)
router.post('/upload', upload.array('files', 20), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0)
        throw (0, error_handler_1.createError)('En az bir dosya yükleyin.');
    const auditItemId = req.body.auditItemId;
    const auditId = req.body.auditId;
    let itemData = { id: null, audit: { id: null, companyId: req.user.companyId, subcontractorId: null } };
    if (auditItemId) {
        const item = await prisma_1.default.auditItem.findFirst({
            where: { id: auditItemId },
            include: { audit: { select: { companyId: true, id: true, subcontractorId: true } } },
        });
        if (!item || item.audit.companyId !== req.user.companyId)
            throw (0, error_handler_1.createError)('Kayıt bulunamadı', 404);
        itemData = { id: item.id, audit: item.audit };
    }
    else if (auditId) {
        const audit = await prisma_1.default.audit.findFirst({ where: { id: auditId, companyId: req.user.companyId } });
        if (!audit)
            throw (0, error_handler_1.createError)('Denetim bulunamadı', 404);
        itemData = { id: null, audit: { id: auditId, companyId: req.user.companyId, subcontractorId: audit.subcontractorId } };
    }
    const documentTypeId = req.body.documentTypeId;
    const description = req.body.description;
    const created = await Promise.all(files.map(async (file) => {
        const cs = checksum(file.path);
        const ev = await prisma_1.default.evidenceFile.create({
            data: {
                companyId: req.user.companyId,
                auditId: itemData.audit.id || null,
                auditItemId: itemData.id || null,
                subcontractorId: itemData.audit.subcontractorId || null,
                documentTypeId: documentTypeId || null,
                originalFilename: file.originalname,
                storedFilename: file.filename,
                storageKey: file.path,
                storageProvider: 'LOCAL',
                mimeType: file.mimetype,
                fileSize: file.size,
                extension: path_1.default.extname(file.originalname).toLowerCase().slice(1),
                checksum: cs,
                uploadedById: req.user.id,
                uploadSource: 'MANUAL',
                description: description || null,
                status: 'active',
            },
            include: { uploadedBy: { select: { name: true } }, documentType: { select: { name: true } } },
        });
        await prisma_1.default.storageObject.create({ data: { companyId: req.user.companyId, storageProvider: 'LOCAL', objectKey: file.path, fileSize: file.size, mimeType: file.mimetype, checksum: cs } });
        if (itemData.audit.id)
            await prisma_1.default.auditLog.create({ data: { companyId: req.user.companyId, userId: req.user.id, entityType: 'EvidenceFile', entityId: ev.id, action: 'UPLOAD', auditId: itemData.audit.id, auditItemId: itemData.id || undefined, newValue: { filename: file.originalname } } });
        return ev;
    }));
    res.status(201).json(created);
});
// POST /api/evidence/upload/:auditItemId — legacy direct upload
router.post('/upload/:auditItemId', upload.array('files', 20), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0)
        throw (0, error_handler_1.createError)('En az bir dosya yükleyin.');
    const item = await prisma_1.default.auditItem.findFirst({
        where: { id: req.params.auditItemId },
        include: { audit: { select: { companyId: true, id: true, subcontractorId: true } } },
    });
    if (!item || item.audit.companyId !== req.user.companyId)
        throw (0, error_handler_1.createError)('Kayıt bulunamadı', 404);
    const documentTypeId = req.body.documentTypeId;
    const description = req.body.description;
    const created = await Promise.all(files.map(async (file) => {
        const cs = checksum(file.path);
        const ev = await prisma_1.default.evidenceFile.create({
            data: {
                companyId: req.user.companyId,
                auditId: item.audit.id,
                auditItemId: req.params.auditItemId,
                subcontractorId: item.audit.subcontractorId,
                documentTypeId: documentTypeId || null,
                originalFilename: file.originalname,
                storedFilename: file.filename,
                storageKey: file.path,
                storageProvider: 'LOCAL',
                mimeType: file.mimetype,
                fileSize: file.size,
                extension: path_1.default.extname(file.originalname).toLowerCase().slice(1),
                checksum: cs,
                uploadedById: req.user.id,
                uploadSource: 'MANUAL',
                description: description || null,
                status: 'active',
            },
            include: { uploadedBy: { select: { name: true } }, documentType: { select: { name: true } } },
        });
        // Storage object record
        await prisma_1.default.storageObject.create({ data: { companyId: req.user.companyId, storageProvider: 'LOCAL', objectKey: file.path, fileSize: file.size, mimeType: file.mimetype, checksum: cs } });
        // Audit log
        await prisma_1.default.auditLog.create({ data: { companyId: req.user.companyId, userId: req.user.id, entityType: 'EvidenceFile', entityId: ev.id, action: 'UPLOAD', auditId: item.audit.id, auditItemId: item.id, newValue: { filename: file.originalname } } });
        return ev;
    }));
    res.status(201).json(created);
});
// POST /api/evidence/external-upload — Mail Agent integration endpoint
router.post('/external-upload', async (req, res) => {
    const schema = zod_1.z.object({
        auditItemId: zod_1.z.string().uuid().optional(),
        auditId: zod_1.z.string().uuid().optional(),
        subcontractorId: zod_1.z.string().uuid().optional(),
        documentTypeId: zod_1.z.string().uuid().optional(),
        filename: zod_1.z.string(),
        storageKey: zod_1.z.string(),
        mimeType: zod_1.z.string().optional(),
        fileSize: zod_1.z.number().optional(),
        uploadSource: zod_1.z.enum(['MAILBOX', 'SECURE_LINK', 'ENTERPRISE_API', 'PORTAL']).default('MAILBOX'),
        sourceMessageId: zod_1.z.string().optional(),
        sourceMetadata: zod_1.z.record(zod_1.z.any()).optional(),
        description: zod_1.z.string().optional(),
    });
    const data = schema.parse(req.body);
    if (data.auditId)
        await (0, auth_guard_1.assertTenant)('audit', data.auditId, req.user.companyId);
    const ev = await prisma_1.default.evidenceFile.create({
        data: {
            companyId: req.user.companyId,
            auditId: data.auditId || null,
            auditItemId: data.auditItemId || null,
            subcontractorId: data.subcontractorId || null,
            documentTypeId: data.documentTypeId || null,
            originalFilename: data.filename,
            storedFilename: data.filename,
            storageKey: data.storageKey,
            storageProvider: 'LOCAL',
            mimeType: data.mimeType || null,
            fileSize: data.fileSize || null,
            uploadedById: req.user.id,
            uploadSource: data.uploadSource,
            sourceMessageId: data.sourceMessageId || null,
            sourceMetadata: data.sourceMetadata || null,
            description: data.description || null,
            status: 'active',
        },
    });
    res.status(201).json(ev);
});
// GET /api/evidence/audit/:auditId
router.get('/audit/:auditId', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('audit', req.params.auditId, req.user.companyId);
    const files = await prisma_1.default.evidenceFile.findMany({
        where: { auditId: req.params.auditId, status: 'active' },
        include: {
            uploadedBy: { select: { name: true } },
            documentType: { select: { name: true, code: true, category: true } },
            auditItem: { select: { auditArea: true, controlSubject: true } },
        },
        orderBy: { uploadedAt: 'desc' },
    });
    res.json(files);
});
// GET /api/evidence/archive — searchable archive
router.get('/archive', async (req, res) => {
    const { subId, auditId, docTypeId, area, filename, page = '1', limit = '50' } = req.query;
    const p = parseInt(page);
    const l = parseInt(limit);
    const where = { companyId: req.user.companyId, status: 'active' };
    if (subId)
        where.subcontractorId = subId;
    if (auditId)
        where.auditId = auditId;
    if (docTypeId)
        where.documentTypeId = docTypeId;
    if (area && area !== '')
        where.auditItem = { auditArea: area };
    if (filename)
        where.originalFilename = { contains: filename, mode: 'insensitive' };
    const [files, total] = await Promise.all([
        prisma_1.default.evidenceFile.findMany({
            where,
            include: { uploadedBy: { select: { name: true } }, documentType: { select: { name: true, code: true, category: true } }, auditItem: { select: { auditArea: true, controlSubject: true } }, audit: { select: { periodMonth: true, periodYear: true } }, subcontractor: { select: { name: true } } },
            orderBy: { uploadedAt: 'desc' },
            skip: (p - 1) * l, take: l,
        }),
        prisma_1.default.evidenceFile.count({ where }),
    ]);
    res.json({ files, total, page: p, limit: l, pages: Math.ceil(total / l) });
});
// DELETE /api/evidence/:id
router.delete('/:id', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('evidence', req.params.id, req.user.companyId);
    await prisma_1.default.evidenceFile.update({ where: { id: req.params.id }, data: { status: 'archived' } });
    res.json({ ok: true });
});
// GET /api/evidence/:id/download
router.get('/:id/download', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('evidence', req.params.id, req.user.companyId);
    const file = await prisma_1.default.evidenceFile.findUnique({ where: { id: req.params.id } });
    if (!file)
        throw (0, error_handler_1.createError)('Dosya bulunamadı', 404);
    if (!fs_1.default.existsSync(file.storageKey))
        throw (0, error_handler_1.createError)('Dosya depolamada bulunamadı', 404);
    res.download(file.storageKey, file.originalFilename);
});
exports.default = router;
//# sourceMappingURL=evidence.router.js.map