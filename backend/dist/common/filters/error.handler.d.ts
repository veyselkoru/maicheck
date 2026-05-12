import { Request, Response, NextFunction } from 'express';
export declare function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void;
export declare function createError(message: string, status?: number): any;
