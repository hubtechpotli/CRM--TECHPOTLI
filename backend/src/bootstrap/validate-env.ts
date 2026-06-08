import { ConfigService } from '@nestjs/config';

const WEAK_SECRETS = new Set([
  'change-me-min-32-characters-long-secret',
  'change-me-min-32-characters-refresh-secret',
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
]);

function assertStrongSecret(name: string, value: string | undefined, minLength = 32) {
  if (!value || value.length < minLength || WEAK_SECRETS.has(value)) {
    throw new Error(
      `${name} must be a strong random value (${minLength}+ characters). ` +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
}

export function validateProductionEnv(config: ConfigService) {
  if (process.env.NODE_ENV !== 'production') return;

  assertStrongSecret('JWT_ACCESS_SECRET', config.get<string>('JWT_ACCESS_SECRET'));
  assertStrongSecret('JWT_REFRESH_SECRET', config.get<string>('JWT_REFRESH_SECRET'));
  assertStrongSecret('ENCRYPTION_KEY', config.get<string>('ENCRYPTION_KEY'), 64);

  const frontendUrl = config.get<string>('FRONTEND_URL');
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required in production (e.g. https://crm.techpotli.com)');
  }
  if (!frontendUrl.startsWith('https://')) {
    console.warn('[production] FRONTEND_URL should use HTTPS for live deployment');
  }

  if (!config.get<string>('DATABASE_URL')) {
    throw new Error('DATABASE_URL is required in production');
  }
}

export async function warnIfNoOfficeIps(prisma: { allowedOfficeIp: { count: (args: object) => Promise<number> } }) {
  if (process.env.NODE_ENV !== 'production') return;
  const count = await prisma.allowedOfficeIp.count({ where: { isActive: true } });
  if (count === 0) {
    console.warn('[production] No office IPs configured — login is allowed from any network until you add Allowed IPs in Settings');
  }
}
