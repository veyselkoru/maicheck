// src/common/filters/error.handler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'Doğrulama hatası', errors: err.flatten() });
    return;
  }
  if (err instanceof Error) {
    console.error('[ERROR]', err.message);
    const status = (err as any).status || 500;
    res.status(status).json({ message: err.message || 'Sunucu hatası' });
    return;
  }
  res.status(500).json({ message: 'Bilinmeyen hata' });
}

export function createError(message: string, status = 400) {
  const err = new Error(message) as any;
  err.status = status;
  return err;
}
