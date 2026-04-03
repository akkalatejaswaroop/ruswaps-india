import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixPasswords() {
  console.log('Fetching all users...');
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    if (!user.password || !user.password.startsWith('$2')) {
      console.log(`User [${user.email || user.phone}] has an invalid or missing password hash. Re-hashing to default: password123`);
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      console.log(`Updated user [${user.email || user.phone}] -> New password: password123`);
    } else {
      console.log(`User [${user.email || user.phone}] already has a valid bcrypt hash.`);
    }
  }
  
  console.log('Finished updating users.');
  process.exit(0);
}

fixPasswords().catch(e => {
  console.error(e);
  process.exit(1);
});
