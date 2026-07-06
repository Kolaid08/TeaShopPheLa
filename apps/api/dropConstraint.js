const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE [Size] DROP CONSTRAINT [Size_WeightGram_df];');
    console.log('Dropped constraint Size_WeightGram_df successfully');
  } catch (e) {
    console.log('Constraint might not exist or another error: ', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
