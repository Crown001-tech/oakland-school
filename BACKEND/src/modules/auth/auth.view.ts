import { StaffProfile, UserRole } from '../../common/types/database.types.js';

export interface UserSessionView {
  user: {
    id: string;
    email: string;
    role: UserRole;
    schoolId?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    department?: string;
  };
  session?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  };
}

export class AuthView {
  static formatSession(
    user: { id: string; email?: string; role?: UserRole; school_id?: string },
    staff: StaffProfile | null,
    sessionData?: { access_token: string; refresh_token?: string; expires_at?: number }
  ): UserSessionView {
    const firstName = staff?.first_name || '';
    const lastName = staff?.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'User';

    return {
      user: {
        id: user.id,
        email: user.email || '',
        role: staff?.role || user.role || 'admin',
        schoolId: staff?.school_id || user.school_id,
        firstName,
        lastName,
        fullName,
        department: staff?.department,
      },
      session: sessionData
        ? {
            accessToken: sessionData.access_token,
            refreshToken: sessionData.refresh_token,
            expiresAt: sessionData.expires_at,
          }
        : undefined,
    };
  }
}
