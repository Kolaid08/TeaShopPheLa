import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu tạo seed data cho hệ thống Phê La...');

  // 1. Employee Roles
  console.log('Đang xử lý Employee Roles...');
  const rolesData = [
    { RoleName: 'Admin', Description: 'Quản trị viên toàn hệ thống', DefaultBaseSalary: 30000 },
    { RoleName: 'Manager', Description: 'Quản lý cửa hàng', DefaultBaseSalary: 25000 },
    { RoleName: 'Staff', Description: 'Nhân viên pha chế/phục vụ', DefaultBaseSalary: 20000 },
  ];
  for (const r of rolesData) {
    const exists = await prisma.employeeRole.findFirst({ where: { RoleName: r.RoleName } });
    if (!exists) {
      await prisma.employeeRole.create({ data: r });
    } else {
      await prisma.employeeRole.update({ where: { RoleID: exists.RoleID }, data: r });
    }
  }

  // Lấy các roles để dùng
  const adminRole = await prisma.employeeRole.findFirst({ where: { RoleName: 'Admin' } });

  // 2. Employees
  console.log('Đang xử lý Employees...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('123456', salt);

  const employeesData = [
    {
      FullName: 'Quản trị viên hệ thống',
      PhoneNumber: '0901234567',
      Email: 'admin@phela.vn',
      Birth: new Date('1995-01-01'),
      Sex: 'Nam',
      PINCode: '1234',
      password: hashedPassword,
      RoleID: adminRole!.RoleID,
    }
  ];

  for (const e of employeesData) {
    const exists = await prisma.employee.findFirst({ where: { Email: e.Email } });
    if (!exists) {
      await prisma.employee.create({ data: e });
    } else {
      await prisma.employee.update({ where: { EmployeeID: exists.EmployeeID }, data: { ...e, password: exists.password } }); // Giữ nguyên mk cũ nếu đã có
    }
  }
  const adminEmp = await prisma.employee.findFirst({ where: { Email: 'admin@phela.vn' } });

  // 3. Units
  console.log('Đang xử lý Units...');
  const unitsData = [
    { UnitName: 'Gram' },
    { UnitName: 'ML' },
    { UnitName: 'Kilogram' },
    { UnitName: 'Lít' },
    { UnitName: 'Hộp' }
  ];
  for (const u of unitsData) {
    const exists = await prisma.unit.findFirst({ where: { UnitName: u.UnitName } });
    if (!exists) await prisma.unit.create({ data: u });
  }

  const unitGram = await prisma.unit.findFirst({ where: { UnitName: 'Gram' } });
  const unitML = await prisma.unit.findFirst({ where: { UnitName: 'ML' } });

  // 4. Ingredients
  console.log('Đang xử lý Ingredients...');
  const ingredientsData = [
    { IngredientName: 'Trà Ô Long Nhài', QuantityStock: 5000, UnitID: unitGram!.UnitID },
    { IngredientName: 'Trà Ô Long Đặc Sản', QuantityStock: 5000, UnitID: unitGram!.UnitID },
    { IngredientName: 'Sữa Đặc', QuantityStock: 10000, UnitID: unitML!.UnitID },
    { IngredientName: 'Sữa Tươi', QuantityStock: 20000, UnitID: unitML!.UnitID },
    { IngredientName: 'Đường', QuantityStock: 15000, UnitID: unitGram!.UnitID },
    { IngredientName: 'Trân Châu Châu Mộc', QuantityStock: 5000, UnitID: unitGram!.UnitID },
  ];
  for (const i of ingredientsData) {
    const exists = await prisma.ingredient.findFirst({ where: { IngredientName: i.IngredientName } });
    if (!exists) {
      await prisma.ingredient.create({ data: i });
    } else {
      await prisma.ingredient.update({ where: { IngredientID: exists.IngredientID }, data: i });
    }
  }

  // 5. Sizes
  console.log('Đang xử lý Sizes...');
  const sizesData = [
    { SizeName: 'M', Description: 'Size Vừa - 500ml', VolumeML: 500 },
    { SizeName: 'L', Description: 'Size Lớn - 700ml', VolumeML: 700 },
  ];
  for (const s of sizesData) {
    const exists = await prisma.size.findFirst({ where: { SizeName: s.SizeName } });
    if (!exists) {
      await prisma.size.create({ data: s });
    } else {
      await prisma.size.update({ where: { SizeID: exists.SizeID }, data: s });
    }
  }

  const sizeM = await prisma.size.findFirst({ where: { SizeName: 'M' } });
  const sizeL = await prisma.size.findFirst({ where: { SizeName: 'L' } });

  // 6. Drinks
  console.log('Đang xử lý Drinks...');
  const drinksData = [
    { DrinkName: 'Ô Long Nhài Sữa', DrinkDescription: 'Trà Ô long thượng hạng ướp hương hoa nhài tinh tế, kết hợp sữa đặc biệt.', DrinkImageURL: 'http://localhost:3001/uploads/olong_nhai_sua.png', DrinkStatus: 'ACTIVE', IsFeatured: true },
    { DrinkName: "Khói B'Lao", DrinkDescription: "Trà Ô long nướng mộc hương khói đậm đà B'Lao, quyện cùng sữa tươi thanh mát.", DrinkImageURL: "http://localhost:3001/uploads/khoi_blao.png", DrinkStatus: "ACTIVE", IsFeatured: true },
    { DrinkName: 'Phan Xi Păng', DrinkDescription: 'Sự kết hợp độc đáo giữa trà Ô long đặc sản và cốt dừa xay tuyết.', DrinkImageURL: 'http://localhost:3001/uploads/phan_xi_pang.png', DrinkStatus: 'ACTIVE', IsFeatured: true },
    { DrinkName: 'Gấm', DrinkDescription: 'Trà Ô long Nhài kết hợp với trái cây nhiệt đới thanh mát.', DrinkImageURL: 'http://localhost:3001/uploads/gam_tra_sua.png', DrinkStatus: 'ACTIVE', IsFeatured: false },
  ];
  for (const d of drinksData) {
    const exists = await prisma.drink.findFirst({ where: { DrinkName: d.DrinkName } });
    if (!exists) {
      await prisma.drink.create({ data: d });
    } else {
      await prisma.drink.update({ where: { DrinkID: exists.DrinkID }, data: d });
    }
  }

  // 7. Drink Sizes
  console.log('Đang xử lý Drink Sizes...');
  const oLongNhai = await prisma.drink.findFirst({ where: { DrinkName: 'Ô Long Nhài Sữa' } });
  const khoiBLao = await prisma.drink.findFirst({ where: { DrinkName: "Khói B'Lao" } });
  
  if (oLongNhai && sizeM && sizeL) {
    const existM = await prisma.drinkSize.findFirst({ where: { DrinkID: oLongNhai.DrinkID, SizeID: sizeM.SizeID } });
    if (!existM) await prisma.drinkSize.create({ data: { DrinkID: oLongNhai.DrinkID, SizeID: sizeM.SizeID, UnitPrice: 45000, DrinkSizeStatus: 'AVAILABLE' } });
    
    const existL = await prisma.drinkSize.findFirst({ where: { DrinkID: oLongNhai.DrinkID, SizeID: sizeL.SizeID } });
    if (!existL) await prisma.drinkSize.create({ data: { DrinkID: oLongNhai.DrinkID, SizeID: sizeL.SizeID, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' } });
  }

  if (khoiBLao && sizeM && sizeL) {
    const existM = await prisma.drinkSize.findFirst({ where: { DrinkID: khoiBLao.DrinkID, SizeID: sizeM.SizeID } });
    if (!existM) await prisma.drinkSize.create({ data: { DrinkID: khoiBLao.DrinkID, SizeID: sizeM.SizeID, UnitPrice: 50000, DrinkSizeStatus: 'AVAILABLE' } });
    
    const existL = await prisma.drinkSize.findFirst({ where: { DrinkID: khoiBLao.DrinkID, SizeID: sizeL.SizeID } });
    if (!existL) await prisma.drinkSize.create({ data: { DrinkID: khoiBLao.DrinkID, SizeID: sizeL.SizeID, UnitPrice: 60000, DrinkSizeStatus: 'AVAILABLE' } });
  }

  // 8. MemberShip Levels
  console.log('Đang xử lý MemberShip Levels...');
  const levelsData = [
    { LevelName: 'Member', DiscountRate: 0.00, RequiredMoney: 0 },
    { LevelName: 'Silver', DiscountRate: 5.00, RequiredMoney: 1000000 },
    { LevelName: 'Gold', DiscountRate: 10.00, RequiredMoney: 5000000 },
    { LevelName: 'Diamond', DiscountRate: 15.00, RequiredMoney: 15000000 },
  ];
  for (const l of levelsData) {
    const exists = await prisma.memberShipLevel.findFirst({ where: { LevelName: l.LevelName } });
    if (!exists) {
      await prisma.memberShipLevel.create({ data: l });
    } else {
      await prisma.memberShipLevel.update({ where: { LevelID: exists.LevelID }, data: l });
    }
  }
  const memberLvl = await prisma.memberShipLevel.findFirst({ where: { LevelName: 'Member' } });

  // 9. Customers
  console.log('Đang xử lý Customers...');
  const customersData = [
    { CustomerName: 'Khách vãng lai', PhoneNumber: '0000000000', TotalMoneySpending: 0, LevelID: memberLvl!.LevelID },
    { CustomerName: 'Nguyễn Văn A', PhoneNumber: '0987654321', Email: 'nguyenvana@gmail.com', TotalMoneySpending: 150000, LevelID: memberLvl!.LevelID },
  ];
  for (const c of customersData) {
    const exists = await prisma.customer.findFirst({ where: { PhoneNumber: c.PhoneNumber } });
    if (!exists) {
      await prisma.customer.create({ data: c });
    } else {
      await prisma.customer.update({ where: { CustomerID: exists.CustomerID }, data: c });
    }
  }

  // 10. Shop Tables
  console.log('Đang xử lý Shop Tables...');
  for (let i = 1; i <= 10; i++) {
    const exists = await prisma.shopTable.findFirst({ where: { ShopTableNumber: i } });
    if (!exists) await prisma.shopTable.create({ data: { ShopTableNumber: i } });
  }

  // 11. Suppliers
  console.log('Đang xử lý Suppliers...');
  const suppliersData = [
    { SupplierName: 'Công ty TNHH Trà Phê La Mộc Châu', SupplierEmail: 'contact@phelamocchau.vn', Street: '123 Mộc Châu', City: 'Sơn La' },
    { SupplierName: 'Công ty Sữa Vinamilk', SupplierEmail: 'sales@vinamilk.com.vn', Street: '10 Tân Trào', City: 'Hồ Chí Minh' },
  ];
  for (const sup of suppliersData) {
    const exists = await prisma.supplier.findFirst({ where: { SupplierEmail: sup.SupplierEmail } });
    if (!exists) {
      await prisma.supplier.create({ data: sup });
    } else {
      await prisma.supplier.update({ where: { SupplierID: exists.SupplierID }, data: sup });
    }
  }

  // 12. Shifts
  console.log('Đang xử lý Shifts...');
  const shiftsData = [
    { ShiftName: 'Ca Sáng', StartTime: '07:00', EndTime: '15:00', Note: 'Ca mở cửa' },
    { ShiftName: 'Ca Chiều', StartTime: '15:00', EndTime: '23:00', Note: 'Ca đóng cửa' },
  ];
  for (const sh of shiftsData) {
    const exists = await prisma.shift.findFirst({ where: { ShiftName: sh.ShiftName } });
    if (!exists) {
      await prisma.shift.create({ data: sh });
    } else {
      await prisma.shift.update({ where: { ShiftID: exists.ShiftID }, data: sh });
    }
  }

  // 13. Recipes & Recipe Details
  console.log('Đang xử lý Recipes...');
  const oLongNhaiDrink = await prisma.drink.findFirst({ where: { DrinkName: 'Ô Long Nhài Sữa' } });
  const traOlong = await prisma.ingredient.findFirst({ where: { IngredientName: 'Trà Ô Long Nhài' } });
  const suaDac = await prisma.ingredient.findFirst({ where: { IngredientName: 'Sữa Đặc' } });

  if (oLongNhaiDrink && traOlong && suaDac) {
    let recipe = await prisma.recipe.findFirst({ where: { DrinkID: oLongNhaiDrink.DrinkID } });
    if (!recipe) {
      recipe = await prisma.recipe.create({ data: { DrinkID: oLongNhaiDrink.DrinkID } });
    }
    
    // Upsert RecipeDetail
    const detail1 = await prisma.recipeDetail.findFirst({ where: { RecipeID: recipe.RecipeID, IngredientID: traOlong.IngredientID } });
    if (!detail1) await prisma.recipeDetail.create({ data: { RecipeID: recipe.RecipeID, IngredientID: traOlong.IngredientID, Quantity: 15 } });

    const detail2 = await prisma.recipeDetail.findFirst({ where: { RecipeID: recipe.RecipeID, IngredientID: suaDac.IngredientID } });
    if (!detail2) await prisma.recipeDetail.create({ data: { RecipeID: recipe.RecipeID, IngredientID: suaDac.IngredientID, Quantity: 40 } });
  }

  // 14. Reviews
  console.log('Đang xử lý Reviews...');
  const customerA = await prisma.customer.findFirst({ where: { PhoneNumber: '0987654321' } });
  if (customerA && oLongNhaiDrink) {
    const existReview = await prisma.review.findFirst({ where: { CustomerID: customerA.CustomerID, DrinkID: oLongNhaiDrink.DrinkID } });
    if (!existReview) {
      await prisma.review.create({
        data: {
          CustomerID: customerA.CustomerID,
          DrinkID: oLongNhaiDrink.DrinkID,
          Rating: 5,
          Comment: 'Trà rất thơm, đậm vị trà và sữa, trân châu mềm dẻo. Sẽ ủng hộ dài dài!',
        }
      });
    }
  }

  // 15. Orders and OrderDetails
  console.log('Đang xử lý Orders...');
  const employeeAdmin = await prisma.employee.findFirst({ where: { Email: 'admin@phela.vn' } });
  const table1 = await prisma.shopTable.findFirst({ where: { ShopTableNumber: 1 } });
  const oLongNhaiM = await prisma.drinkSize.findFirst({
    where: { 
      Drink: { DrinkName: 'Ô Long Nhài Sữa' },
      Size: { SizeName: 'M' }
    }
  });

  if (customerA && employeeAdmin && table1 && oLongNhaiM) {
    const existOrder = await prisma.orders.findFirst({ where: { CustomerID: customerA.CustomerID } });
    if (!existOrder) {
      const order = await prisma.orders.create({
        data: {
          CustomerID: customerA.CustomerID,
          ShopTableID: table1.ShopTableID,
          EmployeeID: employeeAdmin.EmployeeID,
          OrderStatus: 'COMPLETED',
          TotalPrice: 45000,
          PaymentMethod: 'CASH',
          PaymentStatus: 'PAID',
        }
      });
      await prisma.orderDetail.create({
        data: {
          OrderID: order.OrderID,
          DrinkSizeID: oLongNhaiM.DrinkSizeID,
          Quantity: 1,
          Sugar: '100%',
          Ice: '50%',
          UnitPrice: 45000,
        }
      });
    }
  }

  console.log('✅ Chèn dữ liệu seed thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Có lỗi xảy ra trong quá trình seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
