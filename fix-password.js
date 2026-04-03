const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixPasswords() {
  console.log('Fetching users...');
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (!user.password || user.password === '') {
      console.log(`User ${user.email || user.phone} has an empty password. Updating to default password123...`);
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      console.log(`Updated user ${user.email || user.phone}`);
    } else {
      console.log(`User ${user.email || user.phone} already has a password hash.`);
    }
  }
  console.log('Done checking users.');
  process.exit(0);
}

fixPasswords();
