import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../database/prisma';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; companyId: string; name: string };
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const qt = req.query.token as string | undefined;
  const raw = header?.startsWith('Bearer ') ? header.slice(7) : qt;
  if (!raw) { res.status(401).json({ message: 'Kimlik doğrulama gerekli.' }); return; }
  try { req.user = jwt.verify(raw, process.env.JWT_SECRET!) as AuthRequest['user']; next(); }
  catch { res.status(401).json({ message: 'Oturum süresi doldu.' }); }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) { res.status(403).json({ message: 'Yetersiz yetki.' }); return; }
    next();
  };
}

export function createError(message: string, status = 400): Error {
  const e = new Error(message) as any; e.status = status; return e;
}

export async function assertTenant(resource: string, id: string, companyId: string): Promise<void> {
  let owned = false;
  if      (resource === 'audit')         { owned = !!(await prisma.audit.findFirst({ where: { id, companyId } })); }
  else if (resource === 'auditItem')     { const r = await prisma.auditItem.findFirst({ where: { id }, include: { audit: { select: { companyId: true } } } }); owned = !!r && r.audit.companyId === companyId; }
  else if (resource === 'template')      { owned = !!(await prisma.auditTemplate.findFirst({ where: { id, companyId } })); }
  else if (resource === 'subcontractor') { owned = !!(await prisma.subcontractor.findFirst({ where: { id, companyId } })); }
  else if (resource === 'evidence')      { owned = !!(await prisma.evidenceFile.findFirst({ where: { id, companyId } })); }
  else if (resource === 'finding')       { owned = !!(await prisma.finding.findFirst({ where: { id, companyId } })); }
  else if (resource === 'report')        { owned = !!(await prisma.report.findFirst({ where: { id, companyId } })); }
  else if (resource === 'impact')        { owned = !!(await prisma.impactParameter.findFirst({ where: { id, companyId } })); }
  if (!owned) { const e = new Error('Kaynak bulunamadı veya yetkiniz yok.') as any; e.status = 404; throw e; }
}
