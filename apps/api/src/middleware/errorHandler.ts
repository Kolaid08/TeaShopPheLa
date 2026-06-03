import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendResponse } from '../utils/response';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendResponse(res, 400, false, 'Validation failed', { errors: formattedErrors });
  }

  // 2. Custom AppErrors
  if (err instanceof AppError) {
    return sendResponse(res, err.statusCode, false, err.message);
  }

  // 3. Prisma Client Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const fields = (err.meta?.target as string[]) || [];
        return sendResponse(
          res,
          409,
          false,
          `Record conflict: unique constraint failed on field(s) [${fields.join(', ')}]`,
        );
      }
      case 'P2003': {
        return sendResponse(
          res,
          400,
          false,
          'Foreign key constraint failed. Referenced record not found or cannot delete.',
        );
      }
      case 'P2025': {
        return sendResponse(res, 404, false, 'The requested record was not found.');
      }
      default:
        break;
    }
  }

  // 4. Fallback Default 500 Internal Error
  console.error('[Error Handler] Unhandled crash:', err);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Unknown error';
  return sendResponse(res, 500, false, message);
};
