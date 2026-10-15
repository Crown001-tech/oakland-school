import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: string | Record<string, unknown>;
}

export class ResponseUtil {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200, meta?: Record<string, unknown>): Response {
    const payload: ApiResponse<T> = {
      success: true,
      message: message || 'Operation completed successfully',
      data,
      meta,
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return ResponseUtil.success(res, data, message || 'Resource created successfully', 201);
  }

  static error(res: Response, message: string, statusCode = 400, errorDetails?: string | Record<string, unknown>): Response {
    const payload: ApiResponse = {
      success: false,
      message,
      error: errorDetails,
    };
    return res.status(statusCode).json(payload);
  }

  static badRequest(res: Response, message = 'Bad Request'): Response {
    return ResponseUtil.error(res, message, 400);
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return ResponseUtil.error(res, message, 404);
  }

  static unauthorized(res: Response, message = 'Unauthorized access'): Response {
    return ResponseUtil.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden: insufficient permissions'): Response {
    return ResponseUtil.error(res, message, 403);
  }

  static serverError(res: Response, message = 'Internal Server Error', error?: unknown): Response {
    console.error('API Server Error:', error);
    return ResponseUtil.error(res, message, 500, error instanceof Error ? error.message : undefined);
  }
}
