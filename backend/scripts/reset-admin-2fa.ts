import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@techpotli.com';

  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
    select: { email: true, role: true, twoFactorEnabled: true },
  });

  const userRecord = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (userRecord) {
    await prisma.twoFactorBackupCode.deleteMany({ where: { userId: userRecord.id } });
  }

  await prisma.systemSettings.update({
    where: { id: 'default' },
    data: { force2FA: false },
  });

  console.log('2FA reset complete:');
  console.log(`  User: ${user.email} (${user.role}) — twoFactorEnabled: ${user.twoFactorEnabled}`);
  console.log('  System force2FA: false');
  console.log('\nYou can log in again with email + password only.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
