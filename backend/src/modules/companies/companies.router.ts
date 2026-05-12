// src/modules/companies/companies.router.ts v3.1
import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest, requireRole } from '../../common/guards/auth.guard';

const router = Router();
router.use(authGuard);

const LOGO_DIR = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, LOGO_DIR),
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `company_${req.user!.companyId}_${Date.now()}${ext}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (['.png','.jpg','.jpeg','.svg','.webp'].includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Desteklenen formatlar: PNG, JPG, SVG, WEBP'));
  },
});

const subLogoStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, LOGO_DIR),
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const subId = req.params.subId || 'sub';
    cb(null, `sub_${subId}_${Date.now()}${ext}`);
  },
});
const subLogoUpload = multer({ storage: subLogoStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_, file, cb) => { if (['.png','.jpg','.jpeg','.svg','.webp'].includes(path.extname(file.originalname).toLowerCase())) cb(null, true); else cb(new Error('PNG, JPG, SVG, WEBP')); } });

router.get('/me', async (req: AuthRequest, res) => {
  const company = await prisma.company.findUnique({ where: { id: req.user!.companyId } });
  res.json(company);
});

router.patch('/me', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().optional(), address: z.string().nullable().optional(), phone: z.string().nullable().optional(), email: z.string().email().nullable().optional() });
  const data = schema.parse(req.body);
  const updated = await prisma.company.update({ where: { id: req.user!.companyId }, data });
  res.json(updated);
});

// POST /api/companies/me/logo
router.post('/me/logo', requireRole('ADMIN'), logoUpload.single('logo'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ message: 'Dosya bulunamadı' }); return; }
  const logoPath = `/uploads/logos/${req.file.filename}`;
  const updated = await prisma.company.update({ where: { id: req.user!.companyId }, data: { logoPath } });
  res.json({ logoPath: updated.logoPath });
});

// POST /api/companies/subcontractor/:subId/logo
router.post('/subcontractor/:subId/logo', subLogoUpload.single('logo'), async (req: AuthRequest, res) => {
  const sub = await prisma.subcontractor.findFirst({ where: { id: req.params.subId, companyId: req.user!.companyId } });
  if (!sub) { res.status(404).json({ message: 'Alt işveren bulunamadı' }); return; }
  if (!req.file) { res.status(400).json({ message: 'Dosya bulunamadı' }); return; }
  const logoPath = `/uploads/logos/${req.file.filename}`;
  const updated = await prisma.subcontractor.update({ where: { id: req.params.subId }, data: { logoPath } });
  res.json({ logoPath: updated.logoPath });
});

export default router;
