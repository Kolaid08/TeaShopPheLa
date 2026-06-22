const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.review.deleteMany({});
  await prisma.orderDetail.deleteMany({});
  await prisma.orders.deleteMany({});
  console.log('Deleted orders successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
