import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const validDrinkNames = [
    'Ô Long Nhài Sữa', "Khói B'Lao", 'Phan Xi Păng', 'Gấm', 'Lang Biang', 'Tấm', 'Sương Tôn Môn', 'Ô Long Phê La', 'Cà Phê Sữa Đá', 'Bạc Xỉu', 'Trà Chanh Giã Tay', 'Trà Đào Cam Sả', 'Trà Vải Lài', 'Matcha Latte', 'Sữa Tươi Trân Châu Đường Đen', 'Trà Xoài Macchiato', 'Cà Phê Đen Đá', 'Trà Dâu Kem Phô Mai', 'Hồng Trà Sữa', 'Cà Phê Muối'
  ];

  console.log('Đang tìm các món cũ không nằm trong seed data...');
  
  const oldDrinks = await prisma.drink.findMany({
    where: {
      DrinkName: {
        notIn: validDrinkNames
      }
    },
    include: {
      DrinkSizes: true
    }
  });

  if (oldDrinks.length === 0) {
    console.log('Không có món cũ nào cần xoá.');
    return;
  }

  console.log(`Tìm thấy ${oldDrinks.length} món cũ. Đang dọn dẹp các ràng buộc...`);

  // Lấy các DrinkSizeID của món cũ
  const oldDrinkSizeIds = oldDrinks.flatMap(d => d.DrinkSizes.map(ds => ds.DrinkSizeID));

  if (oldDrinkSizeIds.length > 0) {
    // Xoá CartItem liên quan
    await prisma.cartItem.deleteMany({
      where: { DrinkSizeID: { in: oldDrinkSizeIds } }
    });

    // Xoá OrderDetail liên quan
    await prisma.orderDetail.deleteMany({
      where: { DrinkSizeID: { in: oldDrinkSizeIds } }
    });
    
    console.log('Đã dọn dẹp các OrderDetail và CartItem liên quan.');
  }
  
  for (const drink of oldDrinks) {
    try {
      await prisma.drink.delete({
        where: { DrinkID: drink.DrinkID }
      });
      console.log(`✅ Đã xoá món: ${drink.DrinkName}`);
    } catch (error) {
      console.error(`❌ Không thể xoá món ${drink.DrinkName}`);
      console.error(error);
    }
  }

  console.log('Hoàn thành!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
