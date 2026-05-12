// src/modules/actions/actions.router.ts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest } from '../../common/guards/auth.guard';

const router = Router();
router.use(authGuard);

// GET /api/actions — all actions with filters
router.get('/', async (req: AuthRequest, res) => {
  const { status, overdue, auditId } = req.query;
  const now = new Date();
  const where: any = { companyId: req.user!.companyId };
  if (status) where.status = status;
  if (auditId) where.auditItem = { auditId };
  if (overdue === 'true') { where.dueDate = { lt: now }; where.status = { notIn: ['TAMAMLANDI','IPTAL'] }; }

  const actions = await prisma.correctiveAction.findMany({
    where,
    include: {
      auditItem: { select: { auditArea:true, controlSubject:true, compliance:true, riskLevel:true, audit:{ select:{ periodMonth:true, periodYear:true, subcontractor:{ select:{ name:true } } } } } },
      finding: { select: { title:true, severity:true } },
      assignedTo: { select: { name:true } },
    },
    orderBy: [{ dueDate:'asc' }, { createdAt:'desc' }],
  });
  res.json(actions);
});

// PATCH /api/actions/:id
router.patch('/:id', async (req: AuthRequest, res) => {
  const schema = z.object({
    status:           z.enum(['ACIK','DEVAM_EDIYOR','TAMAMLANDI','GECIKTI','IPTAL']).optional(),
    closureNote:      z.string().nullable().optional(),
    responsiblePerson:z.string().nullable().optional(),
    dueDate:          z.string().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const action = await prisma.correctiveAction.update({
    where: { id: req.params.id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : (data.dueDate === null ? null : undefined),
      closedAt: data.status === 'TAMAMLANDI' ? new Date() : undefined,
    },
  });
  res.json(action);
});

export default router;
