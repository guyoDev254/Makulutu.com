import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Default admin (SUPER_ADMIN)
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'CillianMurphy!@#';

  let created = 0;

  const existingAdmin = await prisma.admin.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Super Admin created');
    console.log(`   Username: ${adminUsername} / Password: ${adminPassword}`);
    created++;
  } else {
    console.log('⏭️  Super Admin already exists');
  }

  // Moderator user (MODERATOR role – can view + WhatsApp confirm/remove only)
  const modUsername = process.env.MODERATOR_USERNAME || 'moderator';
  const modEmail = process.env.MODERATOR_EMAIL || 'moderator@example.com';
  const modPassword = process.env.MODERATOR_PASSWORD || 'moderator!@#';

  const existingMod = await prisma.admin.findUnique({
    where: { username: modUsername },
  });

  if (!existingMod) {
    const hashedModPassword = await bcrypt.hash(modPassword, 10);
    await prisma.admin.create({
      data: {
        username: modUsername,
        email: modEmail,
        password: hashedModPassword,
        role: 'MODERATOR',
      },
    });
    console.log('✅ Moderator created');
    console.log(`   Username: ${modUsername} / Password: ${modPassword}`);
    created++;
  } else {
    console.log('⏭️  Moderator already exists');
  }

  // Default monthly price (settings)
  const existingPrice = await prisma.settings.findUnique({
    where: { key: 'default_monthly_price' },
  });
  if (!existingPrice) {
    await prisma.settings.upsert({
      where: { key: 'default_monthly_price' },
      update: {},
      create: { key: 'default_monthly_price', value: '1' },
    });
    console.log('✅ Default monthly price set to 1 KES');
    created++;
  }

  if (created === 0) {
    console.log('✅ Seed complete (nothing new to create)');
  } else {
    console.log(`✅ Seed complete (${created} item(s) created)`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
