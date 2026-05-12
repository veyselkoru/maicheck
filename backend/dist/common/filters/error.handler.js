"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.createError = createError;
const zod_1 = require("zod");
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({ message: 'Doğrulama hatası', errors: err.flatten() });
        return;
    }
    if (err instanceof Error) {
        console.error('[ERROR]', err.message);
        const status = err.status || 500;
        res.status(status).json({ message: err.message || 'Sunucu hatası' });
        return;
    }
    res.status(500).json({ message: 'Bilinmeyen hata' });
}
function createError(message, status = 400) {
    const err = new Error(message);
    err.status = status;
    return err;
}
//# sourceMappingURL=error.handler.js.map