import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        companyId: string;
        name: string;
    };
}
export declare function authGuard(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function createError(message: string, status?: number): Error;
export declare function assertTenant(resource: string, id: string, companyId: string): Promise<void>;
