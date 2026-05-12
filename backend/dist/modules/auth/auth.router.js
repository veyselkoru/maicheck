"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const error_handler_1 = require("../../common/filters/error.handler");
const router = (0, express_1.Router)();
router.post('/login', async (req, res) => {
    const { email, password } = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) }).parse(req.body);
    const user = await prisma_1.default.user.findUnique({ where: { email }, include: { company: true } });
    if (!user || !user.isActive)
        throw (0, error_handler_1.createError)('Kullanıcı bulunamadı', 401);
    if (!await bcryptjs_1.default.compare(password, user.passwordHash))
        throw (0, error_handler_1.createError)('Şifre hatalı', 401);
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, companyId: user.companyId, name: user.name }, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, company: { id: user.company.id, name: user.company.name, plan: user.company.plan } } });
});
router.get('/me', auth_guard_1.authGuard, async (req, res) => {
    const user = await prisma_1.default.user.findUnique({ where: { id: req.user.id }, include: { company: true } });
    if (!user)
        throw (0, error_handler_1.createError)('Bulunamadı', 404);
    const { passwordHash: _, ...safe } = user;
    res.json(safe);
});
exports.default = router;
//# sourceMappingURL=auth.router.js.map