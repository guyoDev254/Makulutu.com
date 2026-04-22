import { Admin } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function parseAdminLoginAliases(): string[] {
  const raw = process.env.ADMIN_LOGIN_ALIASES?.trim() || '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve admin for login: username or email (case-insensitive).
 * Optional: ADMIN_LOGIN_ALIASES (comma-separated) map to the row with username ADMIN_LEGACY_USERNAME
 * (default `admin`) so older installs can keep alternate sign-in names without DB edits.
 */
export async function findAdminByLoginIdentifier(
  prisma: PrismaService,
  rawIdentifier: string,
): Promise<Admin | null> {
  const trimmed = rawIdentifier.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const direct = await prisma.admin.findFirst({
    where: {
      OR: [
        { username: { equals: trimmed, mode: 'insensitive' } },
        { email: { equals: lower, mode: 'insensitive' } },
      ],
    },
  });
  if (direct) return direct;

  const aliases = parseAdminLoginAliases();
  if (!aliases.includes(lower)) return null;

  const legacyUsername = (
    process.env.ADMIN_LEGACY_USERNAME || 'admin'
  ).trim();
  return prisma.admin.findFirst({
    where: {
      username: { equals: legacyUsername, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * SaaS default: do not rename admin rows on login. (Use seed + explicit admin tools for username changes.)
 */
export async function promoteSeededAdminUsernameIfAlias(
  _prisma: PrismaService,
  admin: Admin,
  _loginIdentifierTrimmed: string,
): Promise<Admin> {
  return admin;
}
