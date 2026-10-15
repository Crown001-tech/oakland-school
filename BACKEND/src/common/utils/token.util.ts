import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { ENV } from '../../config/env.js';

export interface UserTokenPayload {
  id: string;
  email: string;
  role: string;
  schoolId?: string | null;
}

export class TokenUtil {
  private static readonly COOKIE_NAME = 'auth_token';
  private static readonly EXPIRES_IN = '7d';
  private static readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  static sign(payload: UserTokenPayload): string {
    return jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: this.EXPIRES_IN,
    });
  }

  static verify(token: string): UserTokenPayload | null {
    try {
      return jwt.verify(token, ENV.JWT_SECRET) as UserTokenPayload;
    } catch {
      return null;
    }
  }

  static setAuthCookie(res: Response, token: string): void {
    res.cookie(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.MAX_AGE_MS,
      path: '/',
    });
  }

  static clearAuthCookie(res: Response): void {
    res.clearCookie(this.COOKIE_NAME, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
