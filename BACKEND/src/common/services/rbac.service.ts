/**
 * Oakland International School - RBAC Service
 * 
 * Centralized evaluation and caching of granular permissions.
 */

import { prisma } from '../../config/prisma.js';
import { UserRole } from '../types/database.types.js';
import { DEFAULT_ROLE_PERMISSIONS, PermissionCode } from '../types/rbac.types.js';

class RbacService {
  private permissionCache: Map<string, { permissions: Set<string>; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Fetches permissions for a role, checking cache first, then Prisma DB,
   * with fallback to in-memory baseline defaults.
   */
  public async getPermissionsForRole(role: UserRole): Promise<string[]> {
    if (role === 'proprietor') {
      return ['*', ...(DEFAULT_ROLE_PERMISSIONS.proprietor || [])];
    }

    const cached = this.permissionCache.get(role);
    const now = Date.now();

    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return Array.from(cached.permissions);
    }

    try {
      const rows: any = await prisma.$queryRaw`
        SELECT p.code
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role = ${role}::user_role_enum
      `;

      if (!rows || rows.length === 0) {
        const defaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
        this.cachePermissions(role, defaults);
        return [...defaults];
      }

      const permissions = rows
        .map((row: any) => row.code)
        .filter(Boolean) as string[];

      this.cachePermissions(role, permissions);
      return permissions;
    } catch (err: any) {
      console.warn(`[RbacService] Warning: Failed to fetch DB permissions for ${role}, using defaults:`, err.message);
      const defaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
      return [...defaults];
    }
  }

  /**
   * Synchronously checks baseline permissions for demo or offline dev mode
   */
  public getDefaultPermissions(role: UserRole): string[] {
    if (role === 'proprietor') {
      return ['*', ...(DEFAULT_ROLE_PERMISSIONS.proprietor || [])];
    }
    return [...(DEFAULT_ROLE_PERMISSIONS[role] || [])];
  }

  /**
   * Check if a set of user permissions contains the required permission
   */
  public hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Wildcard support: if user has 'admin:*' or '*'
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if a set of user permissions satisfies all required permissions
   */
  public hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    if (userPermissions.includes('*')) return true;
    return requiredPermissions.every((p) => this.hasPermission(userPermissions, p));
  }

  /**
   * Check if a set of user permissions satisfies at least one required permission
   */
  public hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    if (userPermissions.includes('*')) return true;
    return requiredPermissions.some((p) => this.hasPermission(userPermissions, p));
  }

  /**
   * Clears the in-memory cache (e.g. after permissions update)
   */
  public clearCache(): void {
    this.permissionCache.clear();
  }

  private cachePermissions(role: string, permissions: string[]): void {
    this.permissionCache.set(role, {
      permissions: new Set(permissions),
      cachedAt: Date.now(),
    });
  }
}

export const rbacService = new RbacService();
