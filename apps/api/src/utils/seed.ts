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
        { DrinkName: 'Trà Ô Long sữa Phêla', DrinkDescription: 'Chữ Phê trà đặc trưng kết hợp sữa ngậy', DrinkStatus: 'ACTIVE' },
        { DrinkName: 'Trà sữa Oolong Nhài', DrinkDescription: 'Hương nhài thoang thoảng với trà oolong', DrinkStatus: 'ACTIVE' },
        { DrinkName: 'Cà phê Cốt dừa Phêla', DrinkDescription: 'Cà phê Espresso cùng cốt dừa sánh mịn', DrinkStatus: 'ACTIVE' },
        { DrinkName: 'Trà Ô Long trân châu', DrinkDescription: 'Oolong truyền thống kèm trân châu hoàng kim', DrinkStatus: 'ACTIVE' },
        { DrinkName: 'Trà Ô Long Nhiệt Đới', DrinkDescription: 'Sự kết hợp hoàn hảo giữa trà ô long và trái cây', DrinkStatus: 'ACTIVE' },
        { DrinkName: 'Cà Phê Trứng Phêla', DrinkDescription: 'Espresso béo ngậy cùng kem trứng đánh bông', DrinkStatus: 'ACTIVE' },
        { DrinkName: 'Trà Sữa Matcha Ô Long', DrinkDescription: 'Bột matcha Nhật Bản hòa quyện cùng cốt trà oolong', DrinkStatus: 'ACTIVE' },
        { DrinkName: 'Cà Phê Espresso Sữa Đặc', DrinkDescription: 'Espresso đậm đặc hòa cùng sữa đặc truyền thống', DrinkStatus: 'ACTIVE' },
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
          { IngredientName: 'Trân châu hoàng kim', QuantityStock: 35.00, UnitID: 2 },
          { IngredientName: 'Kem béo Phêla', QuantityStock: 60.00, UnitID: 1 },
          { IngredientName: 'Bột Matcha Uji', QuantityStock: 15.00, UnitID: 2 },
          { IngredientName: 'Hạt cà phê Robusta Bảo Lộc', QuantityStock: 40.00, UnitID: 2 },
          { IngredientName: 'Sữa đặc ông thọ', QuantityStock: 100.00, UnitID: 1 },
          { IngredientName: 'Thạch ô long giòn', QuantityStock: 25.00, UnitID: 2 },
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
          { RecipeID: r2.RecipeID, IngredientID: 1, Quantity: 0.02 },
          { RecipeID: r2.RecipeID, IngredientID: 2, Quantity: 0.03 },
          { RecipeID: r2.RecipeID, IngredientID: 3, Quantity: 0.04 },
        ]
      });

      // Drink 3: Cà phê Cốt dừa Phêla (DrinkID 3)
      const r3 = await prisma.recipe.create({ data: { DrinkID: 3 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r3.RecipeID, IngredientID: 7, Quantity: 0.02 }, // 0.02 Kg robusta
          { RecipeID: r3.RecipeID, IngredientID: 5, Quantity: 0.05 }, // 0.05 hộp kem béo
          { RecipeID: r3.RecipeID, IngredientID: 3, Quantity: 0.03 }, // 0.03 L đường
        ]
      });

      // Drink 4: Trà Ô Long trân châu (DrinkID 4)
      const r4 = await prisma.recipe.create({ data: { DrinkID: 4 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r4.RecipeID, IngredientID: 1, Quantity: 0.02 },
          { RecipeID: r4.RecipeID, IngredientID: 4, Quantity: 0.05 }, // 0.05 Kg trân châu hoàng kim
          { RecipeID: r4.RecipeID, IngredientID: 3, Quantity: 0.04 },
        ]
      });

      // Drink 5: Trà Ô Long Nhiệt Đới (DrinkID 5)
      const r5 = await prisma.recipe.create({ data: { DrinkID: 5 } });
      await prisma.recipeDetail.createMany({
        data: [
          { RecipeID: r5.RecipeID, IngredientID: 1, Quantity: 0.02 },
          { RecipeID: r5.RecipeID, IngredientID: 3, Quantity: 0.05 },
        ]
      });
    }

    console.log('Database seed check complete successfully.');
  } catch (err) {
    console.error('Error checking or seeding database:', err);
  }
}

