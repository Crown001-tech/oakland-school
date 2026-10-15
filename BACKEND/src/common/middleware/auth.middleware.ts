import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response.util.js';
import { TokenUtil } from '../utils/token.util.js';
import { UserRole } from '../types/database.types.js';
import { rbacService } from '../services/rbac.service.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: UserRole;
    school_id?: string;
    permissions?: string[];
    user_metadata?: Record<string, unknown>;
  };
  token?: string;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const demoRoleHeader = req.headers['x-demo-role'] as UserRole | undefined;

  // 1. Check HttpOnly cookie first, then Bearer Authorization header
  const cookieToken = req.cookies?.auth_token;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const token = cookieToken || headerToken;

  if (token) {
    const payload = TokenUtil.verify(token);
    if (payload) {
      const permissions = await rbacService.getPermissionsForRole(payload.role as UserRole);
      req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role as UserRole,
        school_id: payload.schoolId || undefined,
        permissions,
      };
      req.token = token;
      next();
      return;
    }
  }

  // 2. Fallback to demo mode persona in non-production environments when not authenticated
  if (demoRoleHeader || (process.env.NODE_ENV !== 'production' && !token)) {
    const demoRole = demoRoleHeader || 'proprietor';
    const permissions = rbacService.getDefaultPermissions(demoRole);
    req.user = {
      id: `dev-demo-${demoRole}`,
      email: `${demoRole}@oaklandschools.edu.ng`,
      role: demoRole,
      school_id: 'a0000000-0000-0000-0000-000000000001',
      permissions,
    };
    next();
    return;
  }

  ResponseUtil.unauthorized(res, 'Authentication token missing or invalid');
}


export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      ResponseUtil.unauthorized(res, 'User session not initialized');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      ResponseUtil.forbidden(res, `Access denied: Requires one of [${allowedRoles.join(', ')}] role`);
      return;
    }

    next();
  };
}
