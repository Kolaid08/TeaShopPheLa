import { prisma } from './prisma';

async function main() {
  const result = await prisma.drink.updateMany({
    where: {
      DrinkStatus: 'AVAILABLE'
    },
    data: {
      DrinkStatus: 'ACTIVE'
    }
  });
  console.log(`Updated ${result.count} drinks to ACTIVE.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
