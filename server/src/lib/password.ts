import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const BCRYPT_PREFIX_RE = /^\$2[aby]\$/;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function hashPasswordSync(plain: string): string {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  if (BCRYPT_PREFIX_RE.test(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}

export function isHashed(stored: string | null | undefined): boolean {
  return !!stored && BCRYPT_PREFIX_RE.test(stored);
}
