import argon2 from 'argon2';

export class PasswordUtil {
  /**
   * Hashes a plain-text password using the Argon2id algorithm (OWASP recommended standard).
   */
  static async hash(plainText: string): Promise<string> {
    return argon2.hash(plainText, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,         // 3 iterations
      parallelism: 1,
    });
  }

  /**
   * Verifies a plain-text password against an Argon2 hash.
   */
  static async verify(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  /**
   * Default universal staff account initial password.
   */
  static readonly DEFAULT_STAFF_PASSWORD = 'Oakland@2026';
}
