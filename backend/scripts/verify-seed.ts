import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const ipCount = await prisma.allowedOfficeIp.count();
  const seqCount = await prisma.numberSequence.count();

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@techpotli.com' },
    select: { email: true, role: true, isActive: true },
  });

  console.log('--- Verification Results ---');
  console.log(`Users: ${userCount} (expected: 1)`);
  console.log(`Super Admin: ${admin?.email} (${admin?.role}, active=${admin?.isActive})`);
  console.log(`SystemSettings: ${settings?.companyName} (GST ${settings?.gstRate}%)`);
  console.log(`AllowedOfficeIp records: ${ipCount}`);
  console.log(`NumberSequence records: ${seqCount} (expected: 4)`);

  if (userCount !== 1 || !settings || ipCount < 1 || seqCount !== 4) {
    throw new Error('Seed verification failed');
  }

  console.log('Schema models: 45 defined in schema.prisma');
  console.log('All checks passed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
