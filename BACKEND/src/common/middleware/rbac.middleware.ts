/**
 * Oakland International School - RBAC Middleware
 * 
 * Protects API routes by verifying that the authenticated user has
 * the required granular permissions.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { ResponseUtil } from '../utils/response.util.js';
import { rbacService } from '../services/rbac.service.js';
import { PermissionCode } from '../types/rbac.types.js';

/**
 * Requires the user to possess ALL of the specified permission codes.
 */
export function requirePermission(...requiredPermissions: (PermissionCode | string)[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.role) {
      ResponseUtil.unauthorized(res, 'Authentication required');
      return;
    }

    // Resolve permissions if not already attached to req.user
    if (!req.user.permissions) {
      req.user.permissions = await rbacService.getPermissionsForRole(req.user.role);
    }

    const hasAccess = rbacService.hasAllPermissions(req.user.permissions, requiredPermissions);

    if (!hasAccess) {
      ResponseUtil.forbidden(
        res,
        `Access denied: Missing required permission(s) [${requiredPermissions.join(', ')}]`
      );
      return;
    }

    next();
  };
}

/**
 * Requires the user to possess AT LEAST ONE of the specified permission codes.
 */
export function requireAnyPermission(...requiredPermissions: (PermissionCode | string)[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.role) {
      ResponseUtil.unauthorized(res, 'Authentication required');
      return;
    }

    if (!req.user.permissions) {
      req.user.permissions = await rbacService.getPermissionsForRole(req.user.role);
    }

    const hasAccess = rbacService.hasAnyPermission(req.user.permissions, requiredPermissions);

    if (!hasAccess) {
      ResponseUtil.forbidden(
        res,
        `Access denied: Requires at least one of [${requiredPermissions.join(', ')}]`
      );
      return;
    }

    next();
  };
}
