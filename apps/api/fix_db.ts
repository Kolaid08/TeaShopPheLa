
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const drinks = await prisma.drink.findMany();
  for (const drink of drinks) {
    if (drink.DrinkImageURL && drink.DrinkImageURL.includes('http://localhost:3001')) {
      await prisma.drink.update({
        where: { DrinkID: drink.DrinkID },
        data: { DrinkImageURL: drink.DrinkImageURL.replace('http://localhost:3001', 'https://teashopphela.onrender.com') }
      });
      console.log('Updated Drink:', drink.DrinkID);
    }
  }
}

main().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(console.error);

