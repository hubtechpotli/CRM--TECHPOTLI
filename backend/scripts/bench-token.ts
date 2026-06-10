/**
 * Issue a short-lived JWT for benchmark scripts (creates a DB session row).
 * Usage: npx ts-node --transpile-only scripts/bench-token.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET missing');

  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      role: { in: ['SUPER_ADMIN', 'ADMIN'] },
      twoFactorEnabled: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!user) {
    throw new Error('No active admin with twoFactorEnabled=true found for benchmarking');
  }

  const refreshToken = uuidv4();
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshHash,
      refreshTokenLookup: refreshToken.slice(0, 16),
      device: 'bench',
      browser: 'bench',
      ip: '127.0.0.1',
      userAgent: 'bench-token-script',
      expiresAt,
    },
  });

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, sid: session.id },
    secret,
    { expiresIn: '2h' },
  );

  console.log(accessToken);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
