import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Production seed: super admin only.
 *
 *   cd backend
 *   yarn prisma:seed:prod
 *
 * Requires ADMIN_PASSWORD. Defaults:
 *   ADMIN_USERNAME=makulutu
 *   ADMIN_EMAIL=g.abduba43@gmail.com
 */
async function main() {
  console.log('🌱 Production seed (admin only)…');

  const username = (process.env.ADMIN_USERNAME || 'makulutu').trim();
  const email = (process.env.ADMIN_EMAIL || 'g.abduba43@gmail.com')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!username || !email) {
    throw new Error('ADMIN_USERNAME and ADMIN_EMAIL are required');
  }
  if (!password) {
    throw new Error(
      'Set ADMIN_PASSWORD in backend/.env (or the environment) before production seed',
    );
  }

  const existing = await prisma.admin.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (!existing) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.admin.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log(`✅ Super admin created: ${email} (username ${username})`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.admin.update({
    where: { id: existing.id },
    data: {
      username,
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Super admin updated: ${email} (username ${username})`);
}

main()
  .catch((e) => {
    console.error('❌ Production seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
