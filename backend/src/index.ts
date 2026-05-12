// src/index.ts — mAicheck v3.1
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import authRouter          from './modules/auth/auth.router';
import companiesRouter     from './modules/companies/companies.router';
import subcontractorsRouter from './modules/subcontractors/subcontractors.router';
import templatesRouter     from './modules/templates/templates.router';
import documentTypesRouter from './modules/document-types/document-types.router';
import auditsRouter        from './modules/audits/audits.router';
import auditItemsRouter    from './modules/audit-items/audit-items.router';
import evidenceRouter      from './modules/evidence/evidence.router';
import findingsRouter      from './modules/findings/findings.router';
import actionsRouter       from './modules/actions/actions.router';
import reportsRouter       from './modules/reports/reports.router';
import dashboardRouter     from './modules/dashboard/dashboard.router';
import impactRouter        from './modules/impact/impact.router';
import communicationRouter from './modules/communication/communication.router';
import { errorHandler }    from './common/filters/error.handler';

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
['logos','reports','evidence'].forEach(d => { const p = path.join(UPLOADS_DIR, d); if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); });
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRouter);
app.use('/api/companies',      companiesRouter);
app.use('/api/subcontractors', subcontractorsRouter);
app.use('/api/templates',      templatesRouter);
app.use('/api/document-types', documentTypesRouter);
app.use('/api/audits',         auditsRouter);
app.use('/api/audit-items',    auditItemsRouter);
app.use('/api/evidence',       evidenceRouter);
app.use('/api/findings',       findingsRouter);
app.use('/api/actions',        actionsRouter);
app.use('/api/reports',        reportsRouter);
app.use('/api/dashboard',      dashboardRouter);
app.use('/api/impact',         impactRouter);
app.use('/api/communication',  communicationRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '3.1.0', ts: new Date().toISOString() }));
app.get('/', (_, res) => res.json({ app: 'mAicheck v3.1', status: 'running' }));

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => console.log(`✅ mAicheck v3.1 backend — http://localhost:${PORT}`));

export default app;
