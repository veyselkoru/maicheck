import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest } from '../../common/guards/auth.guard';
import { createError } from '../../common/filters/error.handler';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });
  if (!user || !user.isActive) throw createError('Kullanıcı bulunamadı', 401);
  if (!await bcrypt.compare(password, user.passwordHash)) throw createError('Şifre hatalı', 401);
  const token = jwt.sign({ id:user.id, email:user.email, role:user.role, companyId:user.companyId, name:user.name }, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any });
  res.json({ token, user: { id:user.id, email:user.email, name:user.name, role:user.role, company:{ id:user.company.id, name:user.company.name, plan:user.company.plan } } });
});

router.get('/me', authGuard, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where:{ id:req.user!.id }, include:{ company:true } });
  if (!user) throw createError('Bulunamadı', 404);
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});

export default router;
