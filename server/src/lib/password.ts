import * as bcrypt from 'bcrypt';

const DEFAULT_BCRYPT_COST = 10;
const MIN_BCRYPT_COST = 10;
const MAX_BCRYPT_COST = 31;
const BCRYPT_PREFIX_RE = /^\$2[aby]\$/;

function getBcryptCost(): number {
  const rawCost = process.env.BCRYPT_COST?.trim();

  if (!rawCost) {
    return DEFAULT_BCRYPT_COST;
  }

  const cost = Number(rawCost);

  if (
    !Number.isInteger(cost) ||
    cost < MIN_BCRYPT_COST ||
    cost > MAX_BCRYPT_COST
  ) {
    throw new Error(
      `BCRYPT_COST must be an integer between ${MIN_BCRYPT_COST} and ${MAX_BCRYPT_COST}.`,
    );
  }

  return cost;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, getBcryptCost());
}

export function hashPasswordSync(plain: string): string {
  return bcrypt.hashSync(plain, getBcryptCost());
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
