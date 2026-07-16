import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const toppings = [
    { Name: 'Trân châu Ô Long (Đậm vị)', Price: 10000 },
    { Name: 'Trân châu Trắng (Ngọt nhẹ)', Price: 10000 },
    { Name: 'Thạch Nha Đam', Price: 10000 },
    { Name: 'Kem Cheese phô mai', Price: 15000 },
    { Name: 'Trân châu Đen', Price: 10000 }
  ];

  for (const t of toppings) {
    try {
      await prisma.$executeRaw`
        IF NOT EXISTS (SELECT * FROM Topping WHERE Name = ${t.Name})
        BEGIN
          INSERT INTO Topping (Name, Price, IsActive, createdAt, updatedAt)
          VALUES (${t.Name}, ${t.Price}, 1, GETDATE(), GETDATE())
        END
      `;
      console.log('Seeded:', t.Name);
    } catch (e) {
      console.error('Error seeding', t.Name, e);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
