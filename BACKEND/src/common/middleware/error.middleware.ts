import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response.util.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled Server Exception:', err);
  ResponseUtil.serverError(res, err.message || 'Internal Server Error', err);
}

export function notFoundHandler(_req: Request, res: Response): void {
  ResponseUtil.notFound(res, 'The requested API endpoint does not exist');
}
