import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export async function seedDatabaseIfEmpty() {
  try {
    console.log('Checking database seed state...');

    // 1. Employee Roles
    const roleCount = await prisma.employeeRole.count();
    if (roleCount === 0) {
      console.log('Seeding employee roles...');
      await prisma.employeeRole.createMany({
        data: [
          { RoleName: 'ADMIN', Description: 'Quản trị viên hệ thống', DefaultBaseSalary: 12000000 },
          { RoleName: 'MANAGER', Description: 'Quản lý cửa hàng', DefaultBaseSalary: 8000000 },
          { RoleName: 'STAFF', Description: 'Barista / Thu ngân', DefaultBaseSalary: 5000000 },
        ],
      });
    }

    // 2. Employees
    const employeeCount = await prisma.employee.count();
    if (employeeCount === 0) {
      console.log('Seeding employees...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Create sequentially to guarantee EmployeeID 1 and 2
      await prisma.employee.create({
        data: {
          FullName: 'Nguyễn Hoàng Giang',
          PhoneNumber: '0977112233',
          Email: 'giang@phela.vn',
          Birth: new Date('1995-05-12'),
          Sex: 'MALE',
          PINCode: '1234',
          password: hashedPassword,
          RoleID: 1, // ADMIN (RoleID 1)
        }
      });

      await prisma.employee.create({
        data: {
          FullName: 'Phạm Thanh Thảo',
          PhoneNumber: '0988223344',
          Email: 'thao@phela.vn',
          Birth: new Date('1998-08-20'),
          Sex: 'FEMALE',
          PINCode: '5678',
          password: hashedPassword,
          RoleID: 3, // STAFF (RoleID 3)
        }
      });

      await prisma.employee.create({
        data: {
          FullName: 'Lê Đình Quản Lý',
          PhoneNumber: '0966554433',
          Email: 'manager@phela.vn',
          Birth: new Date('1992-02-10'),
          Sex: 'MALE',
          PINCode: '2222',
          password: hashedPassword,
          RoleID: 2, // MANAGER (RoleID 2)
        }
      });

      await prisma.employee.create({
        data: {
          FullName: 'Trần Văn Shipper',
          PhoneNumber: '0933445566',
          Email: 'shipper@phela.vn',
          Birth: new Date('1997-11-25'),
          Sex: 'MALE',
          PINCode: '3333',
          password: hashedPassword,
          RoleID: 3, // STAFF - Shipper
        }
      });
    }

    // 3. Membership Levels
    const levelCount = await prisma.memberShipLevel.count();
    if (levelCount === 0) {
      console.log('Seeding membership levels...');
      await prisma.memberShipLevel.createMany({
        data: [
          { LevelName: 'Đồng (Bronze)', DiscountRate: 0, RequiredMoney: 0 },
          { LevelName: 'Bạc (Silver)', DiscountRate: 5, RequiredMoney: 1000000 },
          { LevelName: 'Vàng (Gold)', DiscountRate: 10, RequiredMoney: 3000000 },
          { LevelName: 'Kim cương (Diamond)', DiscountRate: 15, RequiredMoney: 10000000 },
        ],
      });
    }

    // 4. Shop Tables
    const tableCount = await prisma.shopTable.count();
    if (tableCount === 0) {
      console.log('Seeding shop tables...');
      await prisma.shopTable.createMany({
        data: [
          { ShopTableNumber: 1 },
          { ShopTableNumber: 2 },
          { ShopTableNumber: 3 },
          { ShopTableNumber: 4 },
        ],
      });
    }

    // 5. Sizes
    const sizeCount = await prisma.size.count();
    if (sizeCount === 0) {
      console.log('Seeding sizes...');
      await prisma.size.createMany({
        data: [
          { SizeName: 'S', Description: 'Nhỏ', VolumeML: 360 },
          { SizeName: 'M', Description: 'Vừa', VolumeML: 500 },
          { SizeName: 'L', Description: 'Lớn', VolumeML: 700 },
        ],
      });
    }

    // 6. Drinks (Sequential creation to maintain auto-increment ids 1 to 8)
    const drinkCount = await prisma.drink.count();
    if (drinkCount === 0) {
      console.log('Seeding drinks...');
      const drinksData = [
        { DrinkName: 'Trà Ô Long sữa Phêla', DrinkDescription: 'Chữ Phê trà đặc trưng kết hợp sữa ngậy', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=800&q=80' },
        { DrinkName: 'Trà sữa Oolong Nhài', DrinkDescription: 'Hương nhài thoang thoảng với trà oolong', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1517701550927-30cfcb64db10?auto=format&fit=crop&w=800&q=80' },
        { DrinkName: 'Cà phê Cốt dừa Phêla', DrinkDescription: 'Cà phê Espresso cùng cốt dừa sánh mịn', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1550246140-5119ae4790b8?auto=format&fit=crop&w=800&q=80' },
        { DrinkName: 'Trà Ô Long trân châu', DrinkDescription: 'Oolong truyền thống kèm trân châu hoàng kim', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1620087754854-3e915474b5c7?auto=format&fit=crop&w=800&q=80' },
        { DrinkName: 'Trà Ô Long Nhiệt Đới', DrinkDescription: 'Sự kết hợp hoàn hảo giữa trà ô long và trái cây', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1595981267035-7b04d84b4f1c?auto=format&fit=crop&w=800&q=80' },
        { DrinkName: 'Cà Phê Trứng Phêla', DrinkDescription: 'Espresso béo ngậy cùng kem trứng đánh bông', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1629853965902-1279cebbf0bc?auto=format&fit=crop&w=800&q=80' },
        { DrinkName: 'Trà Sữa Matcha Ô Long', DrinkDescription: 'Bột matcha Nhật Bản hòa quyện cùng cốt trà oolong', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1582782413158-7c85885f0962?auto=format&fit=crop&w=800&q=80' },
        { DrinkName: 'Cà Phê Espresso Sữa Đặc', DrinkDescription: 'Espresso đậm đặc hòa cùng sữa đặc truyền thống', DrinkStatus: 'ACTIVE', DrinkImageURL: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80' },
      ];

      for (const d of drinksData) {
        await prisma.drink.create({ data: d });
      }
    }

    // 7. Drink Sizes (Prices)
    const drinkSizeCount = await prisma.drinkSize.count();
    if (drinkSizeCount === 0) {
      console.log('Seeding drink sizes...');
      await prisma.drinkSize.createMany({
        data: [
          { DrinkID: 1, SizeID: 1, UnitPrice: 45000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 1, SizeID: 2, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 1, SizeID: 3, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 2, SizeID: 2, UnitPrice: 52000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 2, SizeID: 3, UnitPrice: 62000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 3, SizeID: 1, UnitPrice: 48000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 3, SizeID: 2, UnitPrice: 58000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 4, SizeID: 2, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 4, SizeID: 3, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 5, SizeID: 2, UnitPrice: 58000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 5, SizeID: 3, UnitPrice: 68000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 6, SizeID: 1, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 6, SizeID: 2, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 7, SizeID: 2, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 7, SizeID: 3, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 8, SizeID: 1, UnitPrice: 39000, DrinkSizeStatus: 'AVAILABLE' },
          { DrinkID: 8, SizeID: 2, UnitPrice: 49000, DrinkSizeStatus: 'AVAILABLE' },
        ],
      });
    }

    // 8. Shifts
    const shiftCount = await prisma.shift.count();
    if (shiftCount === 0) {
      console.log('Seeding shifts...');
      await prisma.shift.createMany({
        data: [
          { ShiftName: 'Ca sáng (S)', StartTime: '08:00', EndTime: '12:00', Note: 'Ca 1' },
          { ShiftName: 'Ca chiều (C)', StartTime: '12:00', EndTime: '17:00', Note: 'Ca 2' },
          { ShiftName: 'Ca tối (T)', StartTime: '17:00', EndTime: '22:30', Note: 'Ca 3' },
        ],
      });
    }

    // 9. Units
    const unitCount = await prisma.unit.count();
    if (unitCount === 0) {
      console.log('Seeding units...');
      await prisma.unit.createMany({
        data: [
          { UnitName: 'Hộp' },
          { UnitName: 'Kg' },
          { UnitName: 'Lít' },
          { UnitName: 'Túi' },
          { UnitName: 'Chai' },
        ],
      });
    }

    // 10. Ingredients
    const ingredientCount = await prisma.ingredient.count();
    if (ingredientCount === 0) {
      console.log('Seeding ingredients...');
      await prisma.ingredient.createMany({
        data: [
          { IngredientName: 'Trà Ô Long Bảo Lộc', QuantityStock: 50.00, UnitID: 2 },
          { IngredientName: 'Sữa bột béo chuyên dụng', QuantityStock: 120.00, UnitID: 2 },
          { IngredientName: 'Đường nước tinh luyện', QuantityStock: 80.00, UnitID: 3 },
          { IngredientName: 'Trân châu hoàng kim', QuantityStock: 3.50, UnitID: 2 }, // Cảnh báo tồn kho thấp
          { IngredientName: 'Kem béo Phêla', QuantityStock: 60.00, UnitID: 1 },
          { IngredientName: 'Bột Matcha Uji', QuantityStock: 5.00, UnitID: 2 }, // Cảnh báo tồn kho thấp
          { IngredientName: 'Hạt cà phê Robusta Bảo Lộc', QuantityStock: 40.00, UnitID: 2 },
          { IngredientName: 'Sữa đặc ông thọ', QuantityStock: 8.50, UnitID: 1 }, // Cảnh báo tồn kho thấp
          { IngredientName: 'Thạch ô long giòn', QuantityStock: 25.00, UnitID: 2 },
          { IngredientName: 'Kem trứng tươi', QuantityStock: 10.00, UnitID: 1 },
          { IngredientName: 'Trà Ô Long Nhài', QuantityStock: 30.00, UnitID: 2 },
          { IngredientName: 'Mứt chanh dây nhiệt đới', QuantityStock: 15.00, UnitID: 1 },
          { IngredientName: 'Nước cốt dừa nguyên chất', QuantityStock: 20.00, UnitID: 3 },
        ],
      });
    }

    // 11. Suppliers & SupplierPhones
    const supplierCount = await prisma.supplier.count();
    if (supplierCount === 0) {
      console.log('Seeding suppliers...');
      const s1 = await prisma.supplier.create({
        data: {
          SupplierName: 'Nông trại Ô Long Bảo Lộc S.A',
          SupplierEmail: 'baolocfarm@gmail.com',
          Street: 'Đường 28/3',
          AddressNumber: '45',
          City: 'Bảo Lộc',
          District: 'Lâm Đồng',
          Ward: 'Phường 1',
        }
      });
      await prisma.supplierPhone.create({
        data: {
          SupplierID: s1.SupplierID,
          PhoneNumber: '02633888999'
        }
      });

      const s2 = await prisma.supplier.create({
        data: {
          SupplierName: 'Nhà phân phối Nguyên liệu pha chế Nguyên An',
          SupplierEmail: 'sales@nguyenan.vn',
          Street: 'Đường Hoàng Hoa Thám',
          AddressNumber: '120/8',
          City: 'Hồ Chí Minh',
          District: 'Tân Bình',
          Ward: 'Phường 12',
        }
      });
      await prisma.supplierPhone.create({
        data: {
          SupplierID: s2.SupplierID,
          PhoneNumber: '02866778899'
        }
      });

      const s3 = await prisma.supplier.create({
        data: {
          SupplierName: 'Đại lý sữa và nông sản Đà Lạt Milk',
          SupplierEmail: 'info@dalatmilk.com.vn',
          Street: 'Quốc lộ 20',
          AddressNumber: '250',
          City: 'Đà Lạt',
          District: 'Lâm Đồng',
          Ward: 'Phường 9',
        }
      });
      await prisma.supplierPhone.create({
        data: {
          SupplierID: s3.SupplierID,
          PhoneNumber: '02633999111'
        }
      });
    }

    // 12. Recipes & RecipeDetails
    const recipeCount = await prisma.recipe.count();
    if (recipeCount === 0) {
      console.log('Seeding recipes...');

      // Drink 1: Trà Ô Long sữa Phêla (DrinkID 1)
      const r1 = await prisma.recipe.create({ data: { DrinkID: 1 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r1.RecipeID, IngredientID: 1, Quantity: 0.02 }, // 0.02 Kg trà
          { RecipeID: r1.RecipeID, IngredientID: 2, Quantity: 0.03 }, // 0.03 Kg sữa bột
          { RecipeID: r1.RecipeID, IngredientID: 3, Quantity: 0.04 }, // 0.04 L đường
        ]
      });

      // Drink 2: Trà sữa Oolong Nhài (DrinkID 2)
      const r2 = await prisma.recipe.create({ data: { DrinkID: 2 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r2.RecipeID, IngredientID: 11, Quantity: 0.02 }, // 11 is Trà Ô Long Nhài
          { RecipeID: r2.RecipeID, IngredientID: 2, Quantity: 0.03 },
          { RecipeID: r2.RecipeID, IngredientID: 3, Quantity: 0.04 },
        ]
      });

      // Drink 3: Cà phê Cốt dừa Phêla (DrinkID 3)
      const r3 = await prisma.recipe.create({ data: { DrinkID: 3 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r3.RecipeID, IngredientID: 7, Quantity: 0.02 }, // Robusta
          { RecipeID: r3.RecipeID, IngredientID: 13, Quantity: 0.05 }, // Nước cốt dừa
          { RecipeID: r3.RecipeID, IngredientID: 3, Quantity: 0.03 }, // Đường
        ]
      });

      // Drink 4: Trà Ô Long trân châu (DrinkID 4)
      const r4 = await prisma.recipe.create({ data: { DrinkID: 4 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r4.RecipeID, IngredientID: 1, Quantity: 0.02 },
          { RecipeID: r4.RecipeID, IngredientID: 4, Quantity: 0.05 },
          { RecipeID: r4.RecipeID, IngredientID: 3, Quantity: 0.04 },
        ]
      });

      // Drink 5: Trà Ô Long Nhiệt Đới (DrinkID 5)
      const r5 = await prisma.recipe.create({ data: { DrinkID: 5 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r5.RecipeID, IngredientID: 1, Quantity: 0.02 },
          { RecipeID: r5.RecipeID, IngredientID: 12, Quantity: 0.05 }, // Mứt chanh dây nhiệt đới
          { RecipeID: r5.RecipeID, IngredientID: 3, Quantity: 0.03 },
        ]
      });

      // Drink 6: Cà Phê Trứng Phêla (DrinkID 6)
      const r6 = await prisma.recipe.create({ data: { DrinkID: 6 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r6.RecipeID, IngredientID: 7, Quantity: 0.02 }, // Robusta
          { RecipeID: r6.RecipeID, IngredientID: 10, Quantity: 0.05 }, // Kem trứng tươi
          { RecipeID: r6.RecipeID, IngredientID: 8, Quantity: 0.02 }, // Sữa đặc
        ]
      });

      // Drink 7: Trà Sữa Matcha Ô Long (DrinkID 7)
      const r7 = await prisma.recipe.create({ data: { DrinkID: 7 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r7.RecipeID, IngredientID: 6, Quantity: 0.01 }, // Matcha
          { RecipeID: r7.RecipeID, IngredientID: 1, Quantity: 0.015 }, // Trà Ô Long
          { RecipeID: r7.RecipeID, IngredientID: 2, Quantity: 0.03 }, // Sữa bột
          { RecipeID: r7.RecipeID, IngredientID: 3, Quantity: 0.03 }, // Đường
        ]
      });

      // Drink 8: Cà Phê Espresso Sữa Đặc (DrinkID 8)
      const r8 = await prisma.recipe.create({ data: { DrinkID: 8 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r8.RecipeID, IngredientID: 7, Quantity: 0.025 }, // Robusta
          { RecipeID: r8.RecipeID, IngredientID: 8, Quantity: 0.03 }, // Sữa đặc
        ]
      });
    }

    // 12.5. Ingredient Receipts
    const receiptCount = await prisma.ingredientReceipt.count();
    if (receiptCount === 0) {
      console.log('Seeding ingredient receipts...');
      const rec1 = await prisma.ingredientReceipt.create({
        data: {
          SupplierID: 1, // Nông trại Ô Long
          ShipperID: 3, // Trần Văn Shipper
          ReceivedDate: new Date(),
          IngredientReceiptStatus: 'CONFIRMED',
          ShippingAddress: '45 Đường 28/3, Bảo Lộc',
        }
      });
      await prisma.ingredientReceiptDetail.createMany({
        data: [
          { IngredientReceiptID: rec1.IngredientReceiptID, IngredientID: 1, Quantity: 10, CostPrice: 150000 },
          { IngredientReceiptID: rec1.IngredientReceiptID, IngredientID: 11, Quantity: 5, CostPrice: 180000 },
        ]
      });

      const rec2 = await prisma.ingredientReceipt.create({
        data: {
          SupplierID: 2, // Nhà phân phối Nguyên An
          ShipperID: 3, // Trần Văn Shipper
          ReceivedDate: new Date(),
          IngredientReceiptStatus: 'PENDING',
          ShippingAddress: '120/8 Hoàng Hoa Thám, Tân Bình',
        }
      });
      await prisma.ingredientReceiptDetail.createMany({
        data: [
          { IngredientReceiptID: rec2.IngredientReceiptID, IngredientID: 12, Quantity: 20, CostPrice: 85000 },
          { IngredientReceiptID: rec2.IngredientReceiptID, IngredientID: 13, Quantity: 15, CostPrice: 65000 },
        ]
      });
    }

    // 13. Customers
    const customerCount = await prisma.customer.count();
    if (customerCount === 0) {
      console.log('Seeding customers...');
      await prisma.customer.createMany({
        data: [
          { CustomerName: 'Nguyễn Khách A', PhoneNumber: '0901234567', TotalMoneySpending: 1250000, LevelID: 2 },
          { CustomerName: 'Trần Khách B', PhoneNumber: '0909876543', TotalMoneySpending: 3200000, LevelID: 3 },
          { CustomerName: 'Lê Khách C', PhoneNumber: '0912345678', TotalMoneySpending: 150000, LevelID: 1 },
          { CustomerName: 'Phạm Khách D VIP', PhoneNumber: '0988888888', TotalMoneySpending: 15000000, LevelID: 4 },
        ]
      });
    }

    // 14. Orders (Mocking 6 months of data for Analytics Chart)
    const orderCount = await prisma.orders.count();
    if (orderCount === 0) {
      console.log('Seeding mock orders for analytics chart...');
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed

      // Generate random orders for the past 6 months
      for (let offset = 5; offset >= 0; offset--) {
        const targetMonth = currentMonth - offset;
        const year = targetMonth < 0 ? currentYear - 1 : currentYear;
        const normalizedMonth = targetMonth < 0 ? targetMonth + 12 : targetMonth;

        // Create 5-15 orders per month
        const numOrders = Math.floor(Math.random() * 10) + 5;
        
        for (let i = 0; i < numOrders; i++) {
          const randomDay = Math.floor(Math.random() * 28) + 1;
          const orderDate = new Date(year, normalizedMonth, randomDay, 14, 30, 0);

          const randomVal = Math.random();
          const orderType = randomVal < 0.6 ? 'DINE_IN' : (randomVal < 0.8 ? 'TAKE_AWAY' : 'DELIVERY');
          const paymentMethod = Math.random() < 0.7 ? 'BANKING' : 'CASH';

          const order = await prisma.orders.create({
            data: {
              CustomerID: (Math.floor(Math.random() * 4) + 1), // random customer 1-4
              EmployeeID: 2,
              ShopTableID: orderType === 'DINE_IN' ? (Math.floor(Math.random() * 4) + 1) : null,
              OrderStatus: 'COMPLETED',
              OrderType: orderType,
              PaymentMethod: paymentMethod,
              PaymentStatus: 'COMPLETED',
              TotalPrice: (Math.floor(Math.random() * 3) + 1) * 55000,
              CreatedTime: orderDate,
              createdAt: orderDate,
              updatedAt: orderDate,
            }
          });

          // Add a detail record
          await prisma.orderDetail.create({
            data: {
              OrderID: order.OrderID,
              DrinkSizeID: Math.floor(Math.random() * 15) + 1,
              Quantity: Math.floor(Math.random() * 3) + 1,
              UnitPrice: 55000,
              createdAt: orderDate,
              updatedAt: orderDate,
            }
          });
        }
      }
    }

    console.log('Database seed check complete successfully.');
  } catch (err) {
    console.error('Error checking or seeding database:', err);
  }
}

