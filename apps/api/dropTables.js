const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('DROP TABLE [dbo].[Review];');
  await prisma.$executeRawUnsafe('DROP TABLE [dbo].[OrderDetail];');
  console.log('Dropped tables successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
