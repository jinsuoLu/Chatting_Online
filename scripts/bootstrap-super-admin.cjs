const { createRequire } = require('node:module');
const path = require('node:path');

const apiRequire = createRequire(path.join(__dirname, '../apps/api/package.json'));
const { PrismaClient, UserRole, UserStatus } = apiRequire('@prisma/client');
const argon2 = apiRequire('argon2');

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 12) {
    throw new Error('Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters.');
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.upsert({
      where: { username },
      update: { passwordHash, role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, displayName: '超级管理员' },
      create: { username, passwordHash, role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, displayName: '超级管理员' },
    });
    console.log(`Super administrator ${user.username} is active.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
