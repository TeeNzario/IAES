import { ConfigService } from '@nestjs/config';

export const MIN_JWT_SECRET_LENGTH = 32;

const KNOWN_INSECURE_JWT_SECRETS = new Set([
  'secret123',
  'local-dev-jwt-secret-change-me-2026-iaes-64-characters-minimum',
  'replace-with-random-jwt-secret-at-least-32-chars',
]);

export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim() || undefined;
  const nodeEnv = config.get<string>('NODE_ENV') ?? process.env.NODE_ENV;

  validateJwtSecret(secret, nodeEnv);

  if (!secret) {
    throw new Error('JWT_SECRET must be set.');
  }

  return secret;
}

export function validateJwtSecret(
  secret: string | undefined,
  nodeEnv: string | undefined,
): void {
  const isProduction = nodeEnv === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be set in production.');
    }
    return;
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long.`,
    );
  }

  if (isProduction && KNOWN_INSECURE_JWT_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET is still using a known default placeholder. Set a unique production secret.',
    );
  }
}
