import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ResponseUtil } from '../utils/response.util.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        ResponseUtil.error(res, 'Validation failed for request body', 422, error.format());
        return;
      }
      ResponseUtil.error(res, 'Invalid request payload', 400);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        ResponseUtil.error(res, 'Validation failed for query parameters', 422, error.format());
        return;
      }
      ResponseUtil.error(res, 'Invalid query parameters', 400);
    }
  };
}
