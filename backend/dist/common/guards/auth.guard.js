"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = authGuard;
exports.requireRole = requireRole;
exports.createError = createError;
exports.assertTenant = assertTenant;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../database/prisma"));
function authGuard(req, res, next) {
    const header = req.headers.authorization;
    const qt = req.query.token;
    const raw = header?.startsWith('Bearer ') ? header.slice(7) : qt;
    if (!raw) {
        res.status(401).json({ message: 'Kimlik doğrulama gerekli.' });
        return;
    }
    try {
        req.user = jsonwebtoken_1.default.verify(raw, process.env.JWT_SECRET);
        next();
    }
    catch {
        res.status(401).json({ message: 'Oturum süresi doldu.' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Yetersiz yetki.' });
            return;
        }
        next();
    };
}
function createError(message, status = 400) {
    const e = new Error(message);
    e.status = status;
    return e;
}
async function assertTenant(resource, id, companyId) {
    let owned = false;
    if (resource === 'audit') {
        owned = !!(await prisma_1.default.audit.findFirst({ where: { id, companyId } }));
    }
    else if (resource === 'auditItem') {
        const r = await prisma_1.default.auditItem.findFirst({ where: { id }, include: { audit: { select: { companyId: true } } } });
        owned = !!r && r.audit.companyId === companyId;
    }
    else if (resource === 'template') {
        owned = !!(await prisma_1.default.auditTemplate.findFirst({ where: { id, companyId } }));
    }
    else if (resource === 'subcontractor') {
        owned = !!(await prisma_1.default.subcontractor.findFirst({ where: { id, companyId } }));
    }
    else if (resource === 'evidence') {
        owned = !!(await prisma_1.default.evidenceFile.findFirst({ where: { id, companyId } }));
    }
    else if (resource === 'finding') {
        owned = !!(await prisma_1.default.finding.findFirst({ where: { id, companyId } }));
    }
    else if (resource === 'report') {
        owned = !!(await prisma_1.default.report.findFirst({ where: { id, companyId } }));
    }
    else if (resource === 'impact') {
        owned = !!(await prisma_1.default.impactParameter.findFirst({ where: { id, companyId } }));
    }
    if (!owned) {
        const e = new Error('Kaynak bulunamadı veya yetkiniz yok.');
        e.status = 404;
        throw e;
    }
}
//# sourceMappingURL=auth.guard.js.map