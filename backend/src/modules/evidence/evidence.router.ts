// src/modules/evidence/evidence.router.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest, assertTenant } from '../../common/guards/auth.guard';
import { createError } from '../../common/filters/error.handler';

const router = Router();
router.use(authGuard);

// ─── Storage abstraction (local → S3 ready) ──────────────────────────────────
function getUploadDir() {
  const dir = process.env.UPLOAD_DIR || './uploads';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadDir()),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const ALLOWED_EXTS = ['.pdf','.xlsx','.xls','.docx','.doc','.png','.jpg','.jpeg','.zip','.eml','.msg','.txt','.csv','.json'];

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '100') * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.includes(ext)) cb(null, true);
    else cb(new Error(`Desteklenmeyen dosya türü: ${ext}. İzin verilenler: ${ALLOWED_EXTS.join(', ')}`));
  },
});

function checksum(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// POST /api/evidence/upload — generic upload (auditItemId optional in body)
router.post('/upload', upload.array('files', 20), async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) throw createError('En az bir dosya yükleyin.');

  const auditItemId = req.body.auditItemId as string | undefined;
  const auditId = req.body.auditId as string | undefined;
  let itemData: any = { id: null, audit: { id: null, companyId: req.user!.companyId, subcontractorId: null } };

  if (auditItemId) {
    const item = await prisma.auditItem.findFirst({
      where: { id: auditItemId },
      include: { audit: { select: { companyId: true, id: true, subcontractorId: true } } },
    });
    if (!item || item.audit.companyId !== req.user!.companyId) throw createError('Kayıt bulunamadı', 404);
    itemData = { id: item.id, audit: item.audit };
  } else if (auditId) {
    const audit = await prisma.audit.findFirst({ where: { id: auditId, companyId: req.user!.companyId } });
    if (!audit) throw createError('Denetim bulunamadı', 404);
    itemData = { id: null, audit: { id: auditId, companyId: req.user!.companyId, subcontractorId: audit.subcontractorId } };
  }

  const documentTypeId = req.body.documentTypeId as string | undefined;
  const description    = req.body.description    as string | undefined;

  const created = await Promise.all(files.map(async file => {
    const cs = checksum(file.path);
    const ev = await prisma.evidenceFile.create({
      data: {
        companyId: req.user!.companyId,
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
        extension: path.extname(file.originalname).toLowerCase().slice(1),
        checksum: cs,
        uploadedById: req.user!.id,
        uploadSource: 'MANUAL',
        description: description || null,
        status: 'active',
      },
      include: { uploadedBy: { select: { name: true } }, documentType: { select: { name: true } } },
    });
    await prisma.storageObject.create({ data: { companyId: req.user!.companyId, storageProvider: 'LOCAL', objectKey: file.path, fileSize: file.size, mimeType: file.mimetype, checksum: cs } });
    if (itemData.audit.id) await prisma.auditLog.create({ data:{ companyId:req.user!.companyId, userId:req.user!.id, entityType:'EvidenceFile', entityId:ev.id, action:'UPLOAD', auditId:itemData.audit.id, auditItemId:itemData.id||undefined, newValue:{ filename:file.originalname } as any } });
    return ev;
  }));
  res.status(201).json(created);
});

// POST /api/evidence/upload/:auditItemId — legacy direct upload
router.post('/upload/:auditItemId', upload.array('files', 20), async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) throw createError('En az bir dosya yükleyin.');

  const item = await prisma.auditItem.findFirst({
    where: { id: req.params.auditItemId },
    include: { audit: { select: { companyId: true, id: true, subcontractorId: true } } },
  });
  if (!item || item.audit.companyId !== req.user!.companyId) throw createError('Kayıt bulunamadı', 404);

  const documentTypeId = req.body.documentTypeId as string | undefined;
  const description    = req.body.description    as string | undefined;

  const created = await Promise.all(files.map(async file => {
    const cs = checksum(file.path);
    const ev = await prisma.evidenceFile.create({
      data: {
        companyId:       req.user!.companyId,
        auditId:         item.audit.id,
        auditItemId:     req.params.auditItemId,
        subcontractorId: item.audit.subcontractorId,
        documentTypeId:  documentTypeId || null,
        originalFilename: file.originalname,
        storedFilename:  file.filename,
        storageKey:      file.path,
        storageProvider: 'LOCAL',
        mimeType:        file.mimetype,
        fileSize:        file.size,
        extension:       path.extname(file.originalname).toLowerCase().slice(1),
        checksum:        cs,
        uploadedById:    req.user!.id,
        uploadSource:    'MANUAL',
        description:     description || null,
        status:          'active',
      },
      include: { uploadedBy: { select: { name: true } }, documentType: { select: { name: true } } },
    });

    // Storage object record
    await prisma.storageObject.create({ data: { companyId: req.user!.companyId, storageProvider: 'LOCAL', objectKey: file.path, fileSize: file.size, mimeType: file.mimetype, checksum: cs } });

    // Audit log
    await prisma.auditLog.create({ data:{ companyId:req.user!.companyId, userId:req.user!.id, entityType:'EvidenceFile', entityId:ev.id, action:'UPLOAD', auditId:item.audit.id, auditItemId:item.id, newValue:{ filename:file.originalname } as any } });

    return ev;
  }));

  res.status(201).json(created);
});

// POST /api/evidence/external-upload — Mail Agent integration endpoint
router.post('/external-upload', async (req: AuthRequest, res) => {
  const schema = z.object({
    auditItemId:     z.string().uuid().optional(),
    auditId:         z.string().uuid().optional(),
    subcontractorId: z.string().uuid().optional(),
    documentTypeId:  z.string().uuid().optional(),
    filename:        z.string(),
    storageKey:      z.string(),
    mimeType:        z.string().optional(),
    fileSize:        z.number().optional(),
    uploadSource:    z.enum(['MAILBOX','SECURE_LINK','ENTERPRISE_API','PORTAL']).default('MAILBOX'),
    sourceMessageId: z.string().optional(),
    sourceMetadata:  z.record(z.any()).optional(),
    description:     z.string().optional(),
  });
  const data = schema.parse(req.body);
  if (data.auditId) await assertTenant('audit', data.auditId, req.user!.companyId);

  const ev = await prisma.evidenceFile.create({
    data: {
      companyId:       req.user!.companyId,
      auditId:         data.auditId || null,
      auditItemId:     data.auditItemId || null,
      subcontractorId: data.subcontractorId || null,
      documentTypeId:  data.documentTypeId || null,
      originalFilename: data.filename,
      storedFilename:  data.filename,
      storageKey:      data.storageKey,
      storageProvider: 'LOCAL',
      mimeType:        data.mimeType || null,
      fileSize:        data.fileSize || null,
      uploadedById:    req.user!.id,
      uploadSource:    data.uploadSource as any,
      sourceMessageId: data.sourceMessageId || null,
      sourceMetadata:  data.sourceMetadata || null,
      description:     data.description || null,
      status:          'active',
    },
  });
  res.status(201).json(ev);
});

// GET /api/evidence/audit/:auditId
router.get('/audit/:auditId', async (req: AuthRequest, res) => {
  await assertTenant('audit', req.params.auditId, req.user!.companyId);
  const files = await prisma.evidenceFile.findMany({
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
router.get('/archive', async (req: AuthRequest, res) => {
  const { subId, auditId, docTypeId, area, filename, page = '1', limit = '50' } = req.query;
  const p = parseInt(page as string);
  const l = parseInt(limit as string);
  const where: any = { companyId: req.user!.companyId, status: 'active' };
  if (subId)    where.subcontractorId = subId;
  if (auditId)  where.auditId = auditId;
  if (docTypeId)where.documentTypeId = docTypeId;
  if (area && area !== '') where.auditItem = { auditArea: area };
  if (filename) where.originalFilename = { contains: filename as string, mode: 'insensitive' };

  const [files, total] = await Promise.all([
    prisma.evidenceFile.findMany({
      where,
      include: { uploadedBy:{select:{name:true}}, documentType:{select:{name:true,code:true,category:true}}, auditItem:{select:{auditArea:true,controlSubject:true}}, audit:{select:{periodMonth:true,periodYear:true}}, subcontractor:{select:{name:true}} },
      orderBy: { uploadedAt: 'desc' },
      skip: (p-1)*l, take: l,
    }),
    prisma.evidenceFile.count({ where }),
  ]);
  res.json({ files, total, page: p, limit: l, pages: Math.ceil(total/l) });
});

// DELETE /api/evidence/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  await assertTenant('evidence', req.params.id, req.user!.companyId);
  await prisma.evidenceFile.update({ where: { id: req.params.id }, data: { status: 'archived' } });
  res.json({ ok: true });
});

// GET /api/evidence/:id/download
router.get('/:id/download', async (req: AuthRequest, res) => {
  await assertTenant('evidence', req.params.id, req.user!.companyId);
  const file = await prisma.evidenceFile.findUnique({ where: { id: req.params.id } });
  if (!file) throw createError('Dosya bulunamadı', 404);
  if (!fs.existsSync(file.storageKey)) throw createError('Dosya depolamada bulunamadı', 404);
  res.download(file.storageKey, file.originalFilename);
});

export default router;
