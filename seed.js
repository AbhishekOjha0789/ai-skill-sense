import prisma from './src/services/prisma.js';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'abhishek@test.com' },
    update: {},
    create: {
      id: 'abc1',
      email: 'abhishek@test.com',
      name: 'Abhishek',
    },
  });
  console.log('Test user ready:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });