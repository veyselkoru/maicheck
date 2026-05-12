"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts — mAicheck v3.1
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_router_1 = __importDefault(require("./modules/auth/auth.router"));
const companies_router_1 = __importDefault(require("./modules/companies/companies.router"));
const subcontractors_router_1 = __importDefault(require("./modules/subcontractors/subcontractors.router"));
const templates_router_1 = __importDefault(require("./modules/templates/templates.router"));
const document_types_router_1 = __importDefault(require("./modules/document-types/document-types.router"));
const audits_router_1 = __importDefault(require("./modules/audits/audits.router"));
const audit_items_router_1 = __importDefault(require("./modules/audit-items/audit-items.router"));
const evidence_router_1 = __importDefault(require("./modules/evidence/evidence.router"));
const findings_router_1 = __importDefault(require("./modules/findings/findings.router"));
const actions_router_1 = __importDefault(require("./modules/actions/actions.router"));
const reports_router_1 = __importDefault(require("./modules/reports/reports.router"));
const dashboard_router_1 = __importDefault(require("./modules/dashboard/dashboard.router"));
const impact_router_1 = __importDefault(require("./modules/impact/impact.router"));
const communication_router_1 = __importDefault(require("./modules/communication/communication.router"));
const error_handler_1 = require("./common/filters/error.handler");
const app = (0, express_1.default)();
// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Static file serving for uploads
const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR))
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
['logos', 'reports', 'evidence'].forEach(d => { const p = path_1.default.join(UPLOADS_DIR, d); if (!fs_1.default.existsSync(p))
    fs_1.default.mkdirSync(p, { recursive: true }); });
app.use('/uploads', express_1.default.static(UPLOADS_DIR));
// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth', auth_router_1.default);
app.use('/api/companies', companies_router_1.default);
app.use('/api/subcontractors', subcontractors_router_1.default);
app.use('/api/templates', templates_router_1.default);
app.use('/api/document-types', document_types_router_1.default);
app.use('/api/audits', audits_router_1.default);
app.use('/api/audit-items', audit_items_router_1.default);
app.use('/api/evidence', evidence_router_1.default);
app.use('/api/findings', findings_router_1.default);
app.use('/api/actions', actions_router_1.default);
app.use('/api/reports', reports_router_1.default);
app.use('/api/dashboard', dashboard_router_1.default);
app.use('/api/impact', impact_router_1.default);
app.use('/api/communication', communication_router_1.default);
app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '3.1.0', ts: new Date().toISOString() }));
app.get('/', (_, res) => res.json({ app: 'mAicheck v3.1', status: 'running' }));
// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
app.use(error_handler_1.errorHandler);
const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => console.log(`✅ mAicheck v3.1 backend — http://localhost:${PORT}`));
exports.default = app;
//# sourceMappingURL=index.js.map