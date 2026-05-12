import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../database/prisma';
import { authGuard, AuthRequest } from '../../common/guards/auth.guard';

const router = Router();
router.use(authGuard);

const schema = z.object({
  name: z.string().min(2), taxNumber: z.string().optional(), sgkSicilNo: z.string().optional(),
  contractStart: z.string().optional(), contractEnd: z.string().optional(),
  workArea: z.string().optional(), responsiblePerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')), phone: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const items = await prisma.subcontractor.findMany({ where:{ companyId:req.user!.companyId, isActive:true }, include:{ _count:{ select:{ audits:true } } }, orderBy:{ name:'asc' } });
  res.json(items);
});
router.get('/:id', async (req: AuthRequest, res) => {
  const item = await prisma.subcontractor.findFirst({ where:{ id:req.params.id, companyId:req.user!.companyId }, include:{ audits:{ orderBy:[{periodYear:'desc'},{periodMonth:'desc'}], take:10, include:{ _count:{ select:{ items:true } } } } } });
  res.json(item);
});
router.post('/', async (req: AuthRequest, res) => {
  const data = schema.parse(req.body);
  const item = await prisma.subcontractor.create({ data:{ ...data, contractStart:data.contractStart?new Date(data.contractStart):null, contractEnd:data.contractEnd?new Date(data.contractEnd):null, email:data.email||null, companyId:req.user!.companyId } as any });
  res.status(201).json(item);
});
router.patch('/:id', async (req: AuthRequest, res) => {
  const data = schema.partial().parse(req.body);
  await prisma.subcontractor.updateMany({ where:{ id:req.params.id, companyId:req.user!.companyId }, data:{ ...data, contractStart:data.contractStart?new Date(data.contractStart):undefined, contractEnd:data.contractEnd?new Date(data.contractEnd):undefined } });
  res.json({ ok:true });
});
router.delete('/:id', async (req: AuthRequest, res) => {
  await prisma.subcontractor.updateMany({ where:{ id:req.params.id, companyId:req.user!.companyId }, data:{ isActive:false } });
  res.json({ ok:true });
});

export default router;
