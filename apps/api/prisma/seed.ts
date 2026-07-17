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
    { RoleName: 'Shipper', Description: 'Nhân viên giao hàng', DefaultBaseSalary: 15000 },
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
  const managerRole = await prisma.employeeRole.findFirst({ where: { RoleName: 'Manager' } });
  const staffRole = await prisma.employeeRole.findFirst({ where: { RoleName: 'Staff' } });
  const shipperRole = await prisma.employeeRole.findFirst({ where: { RoleName: 'Shipper' } });

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
    },
    {
      FullName: 'Lê Đình Quản Lý',
      PhoneNumber: '0966554433',
      Email: 'manager@phela.vn',
      Birth: new Date('1992-02-10'),
      Sex: 'Nam',
      PINCode: '2222',
      password: hashedPassword,
      RoleID: managerRole!.RoleID,
    },
    {
      FullName: 'Trần Văn Shipper',
      PhoneNumber: '0933445566',
      Email: 'shipper@phela.vn',
      Birth: new Date('1997-11-25'),
      Sex: 'Nam',
      PINCode: '3333',
      password: hashedPassword,
      RoleID: shipperRole!.RoleID,
    },
    {
      FullName: 'Nguyễn Văn Staff',
      PhoneNumber: '0911223344',
      Email: 'staff@phela.vn',
      Birth: new Date('1999-05-15'),
      Sex: 'Nữ',
      PINCode: '4444',
      password: hashedPassword,
      RoleID: staffRole!.RoleID,
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
    { IngredientName: 'Mứt chanh dây nhiệt đới', QuantityStock: 5000, UnitID: unitGram!.UnitID },
    { IngredientName: 'Nước cốt dừa nguyên chất', QuantityStock: 10000, UnitID: unitML!.UnitID },
    { IngredientName: 'Kem trứng tươi', QuantityStock: 5000, UnitID: unitGram!.UnitID },
    { IngredientName: 'Bột Matcha Uji', QuantityStock: 5000, UnitID: unitGram!.UnitID },
    { IngredientName: 'Cà phê Robusta', QuantityStock: 10000, UnitID: unitGram!.UnitID },
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
    { DrinkName: 'Ô Long Nhài Sữa', DrinkDescription: 'Trà Ô long thượng hạng ướp hương hoa nhài tinh tế, kết hợp sữa đặc biệt.', DrinkImageURL: 'http://localhost:3001/uploads/o_long_nhai_sua.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: "Khói B'Lao", DrinkDescription: "Trà Ô long nướng mộc hương khói đậm đà B'Lao, quyện cùng sữa tươi thanh mát.", DrinkImageURL: "http://localhost:3001/uploads/khoi_b_lao.png", DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Phan Xi Păng', DrinkDescription: 'Sự kết hợp độc đáo giữa trà Ô long đặc sản và cốt dừa xay tuyết.', DrinkImageURL: 'http://localhost:3001/uploads/phan_xi_pang.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Gấm', DrinkDescription: 'Trà Ô long Nhài kết hợp với trái cây nhiệt đới thanh mát.', DrinkImageURL: 'http://localhost:3001/uploads/gam.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Lang Biang', DrinkDescription: 'Trà Ô long đặc sản hoà quyện với hương vị núi rừng Lang Biang.', DrinkImageURL: 'http://localhost:3001/uploads/lang_biang.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Tấm', DrinkDescription: 'Trà xanh mộc châu ướp hương cốm non, thanh tao nhẹ nhàng.', DrinkImageURL: 'http://localhost:3001/uploads/tam.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Sương Tôn Môn', DrinkDescription: 'Trà đen hảo hạng kết hợp với lớp kem sữa béo ngậy.', DrinkImageURL: 'http://localhost:3001/uploads/suong_ton_mon.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Ô Long Phê La', DrinkDescription: 'Trà Ô long đặc sản Phê La nguyên bản.', DrinkImageURL: 'http://localhost:3001/uploads/o_long_phe_la.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Cà Phê Sữa Đá', DrinkDescription: 'Cà phê Việt Nam pha phin truyền thống với sữa đặc.', DrinkImageURL: 'http://localhost:3001/uploads/ca_phe_sua_da.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Bạc Xỉu', DrinkDescription: 'Cà phê hòa quyện với sữa đặc và sữa tươi, ngọt ngào dễ uống.', DrinkImageURL: 'http://localhost:3001/uploads/bac_xiu.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Trà Chanh Giã Tay', DrinkDescription: 'Trà đen kết hợp với chanh tươi giã tay thơm mát.', DrinkImageURL: 'http://localhost:3001/uploads/tra_chanh_gia_tay.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Trà Đào Cam Sả', DrinkDescription: 'Trà đào thanh mát thêm vị cam sả giải nhiệt.', DrinkImageURL: 'http://localhost:3001/uploads/tra_dao_cam_sa.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Trà Vải Lài', DrinkDescription: 'Trà nhài êm dịu kết hợp cùng trái vải tươi.', DrinkImageURL: 'http://localhost:3001/uploads/tra_vai_lai.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Matcha Latte', DrinkDescription: 'Trà xanh Nhật Bản nguyên chất với sữa tươi.', DrinkImageURL: 'http://localhost:3001/uploads/matcha_latte.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Sữa Tươi Trân Châu Đường Đen', DrinkDescription: 'Sữa tươi Đà Lạt quyện cùng trân châu nấu đường đen dẻo thơm.', DrinkImageURL: 'http://localhost:3001/uploads/sua_tuoi_tran_chau_duong_den.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Trà Xoài Macchiato', DrinkDescription: 'Trà xoài nhiệt đới phủ lớp macchiato mặn ngọt béo ngậy.', DrinkImageURL: 'http://localhost:3001/uploads/tra_xoai_macchiato.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Cà Phê Đen Đá', DrinkDescription: 'Cà phê đậm vị, đắng thanh, đúng chất cà phê phin.', DrinkImageURL: 'http://localhost:3001/uploads/ca_phe_den_da.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Trà Dâu Kem Phô Mai', DrinkDescription: 'Trà dâu tây tươi chua ngọt kèm lớp kem phô mai sánh mịn.', DrinkImageURL: 'http://localhost:3001/uploads/tra_dau_kem_pho_mai.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Hồng Trà Sữa', DrinkDescription: 'Hồng trà cổ điển pha cùng sữa bột béo ngậy.', DrinkImageURL: 'http://localhost:3001/uploads/hong_tra_sua.png', DrinkStatus: 'ACTIVE' },
    { DrinkName: 'Cà Phê Muối', DrinkDescription: 'Cà phê đắng nhẹ phủ lớp kem mặn độc đáo.', DrinkImageURL: 'http://localhost:3001/uploads/ca_phe_muoi.png', DrinkStatus: 'ACTIVE' }
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
  const allDrinks = await prisma.drink.findMany();
  
  if (sizeM && sizeL) {
    for (const drink of allDrinks) {
      let priceM = 45000;
      let priceL = 55000;
      if (drink.DrinkName.includes('Cà Phê') || drink.DrinkName.includes('Bạc Xỉu')) { priceM = 35000; priceL = 45000; }
      else if (drink.DrinkName.includes('Đặc Sản') || drink.DrinkName === 'Phan Xi Păng') { priceM = 55000; priceL = 65000; }
      else if (drink.DrinkName.includes('Matcha') || drink.DrinkName.includes('Sương Tôn Môn')) { priceM = 50000; priceL = 60000; }

      // Size M
      const existM = await prisma.drinkSize.findFirst({ where: { DrinkID: drink.DrinkID, SizeID: sizeM.SizeID } });
      if (!existM) {
        await prisma.drinkSize.create({ data: { DrinkID: drink.DrinkID, SizeID: sizeM.SizeID, UnitPrice: priceM, DrinkSizeStatus: 'AVAILABLE' } });
      } else {
        await prisma.drinkSize.update({ where: { DrinkSizeID: existM.DrinkSizeID }, data: { UnitPrice: priceM, DrinkSizeStatus: 'AVAILABLE' } });
      }

      // Size L
      const existL = await prisma.drinkSize.findFirst({ where: { DrinkID: drink.DrinkID, SizeID: sizeL.SizeID } });
      if (!existL) {
        await prisma.drinkSize.create({ data: { DrinkID: drink.DrinkID, SizeID: sizeL.SizeID, UnitPrice: priceL, DrinkSizeStatus: 'AVAILABLE' } });
      } else {
        await prisma.drinkSize.update({ where: { DrinkSizeID: existL.DrinkSizeID }, data: { UnitPrice: priceL, DrinkSizeStatus: 'AVAILABLE' } });
      }
    }
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
    { CustomerName: 'Nguyễn Văn A', PhoneNumber: '0987654321', TotalMoneySpending: 150000, LevelID: memberLvl!.LevelID },
    { CustomerName: 'Trần Thị B', PhoneNumber: '0912345678', TotalMoneySpending: 550000, LevelID: memberLvl!.LevelID },
    { CustomerName: 'Lê Văn C', PhoneNumber: '0923456789', TotalMoneySpending: 1200000, LevelID: memberLvl!.LevelID },
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

  const allSuppliersDb = await prisma.supplier.findMany();
  for (const sup of allSuppliersDb) {
    const existsPhone = await prisma.supplierPhone.findFirst({ where: { SupplierID: sup.SupplierID } });
    if (!existsPhone) {
      await prisma.supplierPhone.create({ data: { SupplierID: sup.SupplierID, PhoneNumber: '0888' + Math.floor(100000 + Math.random() * 900000) } });
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
  const allIngredients = await prisma.ingredient.findMany();
  const getIngId = (name: string) => allIngredients.find(i => i.IngredientName === name)?.IngredientID;
  const allDrinksDb = await prisma.drink.findMany();
  const getDrinkId = (name: string) => allDrinksDb.find(d => d.DrinkName === name)?.DrinkID;

  const recipesToAdd = [
    {
      drink: 'Ô Long Nhài Sữa',
      details: [
        { name: 'Trà Ô Long Nhài', qty: 15 },
        { name: 'Sữa Đặc', qty: 40 },
        { name: 'Đường', qty: 20 }
      ]
    },
    {
      drink: 'Cà Phê Muối',
      details: [
        { name: 'Cà phê Robusta', qty: 20 },
        { name: 'Sữa Đặc', qty: 25 },
        { name: 'Kem trứng tươi', qty: 30 }
      ]
    },
    {
      drink: 'Matcha Latte',
      details: [
        { name: 'Bột Matcha Uji', qty: 10 },
        { name: 'Sữa Tươi', qty: 150 },
        { name: 'Đường', qty: 15 }
      ]
    },
    {
      drink: 'Gấm',
      details: [
        { name: 'Trà Ô Long Nhài', qty: 15 },
        { name: 'Mứt chanh dây nhiệt đới', qty: 40 }
      ]
    },
    {
      drink: 'Phan Xi Păng',
      details: [
        { name: 'Trà Ô Long Đặc Sản', qty: 15 },
        { name: 'Nước cốt dừa nguyên chất', qty: 50 },
        { name: 'Đường', qty: 20 }
      ]
    }
  ];

  // Auto-generate mock recipes for drinks that don't have one
  for (const drink of allDrinksDb) {
    const hasRecipe = recipesToAdd.find(r => r.drink === drink.DrinkName);
    if (!hasRecipe) {
      recipesToAdd.push({
        drink: drink.DrinkName,
        details: [
          { name: 'Trà Ô Long Nhài', qty: 10 },
          { name: 'Đường', qty: 15 },
          { name: 'Sữa Tươi', qty: 50 }
        ]
      });
    }
  }

  for (const r of recipesToAdd) {
    const dId = getDrinkId(r.drink);
    if (!dId) continue;

    let recipe = await prisma.recipe.findFirst({ where: { DrinkID: dId } });
    if (!recipe) {
      recipe = await prisma.recipe.create({ data: { DrinkID: dId } });
    }

    for (const d of r.details) {
      const iId = getIngId(d.name);
      if (!iId) continue;
      
      const existDetail = await prisma.recipeDetail.findFirst({ where: { RecipeID: recipe.RecipeID, IngredientID: iId } });
      if (!existDetail) {
        await prisma.recipeDetail.create({ data: { RecipeID: recipe.RecipeID, IngredientID: iId, Quantity: d.qty } });
      } else {
        await prisma.recipeDetail.update({ where: { RecipeID_IngredientID: { RecipeID: recipe.RecipeID, IngredientID: iId } }, data: { Quantity: d.qty } });
      }
    }
  }

  // 13.5 Ingredient Receipts
  console.log('Đang xử lý Ingredient Receipts...');
  const receiptCount = await prisma.ingredientReceipt.count();
  if (receiptCount === 0) {
    const sup1 = await prisma.supplier.findFirst({ where: { SupplierName: 'Công ty TNHH Trà Phê La Mộc Châu' } });
    const sup2 = await prisma.supplier.findFirst({ where: { SupplierName: 'Công ty Sữa Vinamilk' } });
    const shipper = await prisma.employee.findFirst({ where: { Email: 'shipper@phela.vn' } });

    if (sup1 && sup2 && shipper) {
      const rec1 = await prisma.ingredientReceipt.create({
        data: {
          SupplierID: sup1.SupplierID,
          ShipperID: shipper.EmployeeID,
          ReceivedDate: new Date(),
          IngredientReceiptStatus: 'CONFIRMED',
          ShippingAddress: '123 Cửa Hàng Phê La',
        }
      });
      await prisma.ingredientReceiptDetail.createMany({
        data: [
          { IngredientReceiptID: rec1.IngredientReceiptID, IngredientID: getIngId('Trà Ô Long Nhài')!, Quantity: 10, CostPrice: 150000 },
          { IngredientReceiptID: rec1.IngredientReceiptID, IngredientID: getIngId('Trà Ô Long Đặc Sản')!, Quantity: 15, CostPrice: 180000 },
        ]
      });

      const rec2 = await prisma.ingredientReceipt.create({
        data: {
          SupplierID: sup2.SupplierID,
          ShipperID: shipper.EmployeeID,
          ReceivedDate: new Date(),
          IngredientReceiptStatus: 'PENDING',
          ShippingAddress: '123 Cửa Hàng Phê La',
        }
      });
      await prisma.ingredientReceiptDetail.createMany({
        data: [
          { IngredientReceiptID: rec2.IngredientReceiptID, IngredientID: getIngId('Sữa Tươi')!, Quantity: 20, CostPrice: 25000 },
          { IngredientReceiptID: rec2.IngredientReceiptID, IngredientID: getIngId('Sữa Đặc')!, Quantity: 15, CostPrice: 35000 },
        ]
      });
    }
  }

  // 14. Reviews
  console.log('Đang xử lý Reviews...');
  const customerA = await prisma.customer.findFirst({ where: { PhoneNumber: '0987654321' } });
  const oLongNhaiDrinkDb = await prisma.drink.findFirst({ where: { DrinkName: 'Ô Long Nhài Sữa' } });
  if (customerA && oLongNhaiDrinkDb) {
    const existReview = await prisma.review.findFirst({ where: { CustomerID: customerA.CustomerID, DrinkID: oLongNhaiDrinkDb.DrinkID } });
    if (!existReview) {
      await prisma.review.create({
        data: {
          CustomerID: customerA.CustomerID,
          DrinkID: oLongNhaiDrinkDb.DrinkID,
          Rating: 5,
          Comment: 'Trà rất thơm, đậm vị trà và sữa, trân châu mềm dẻo. Sẽ ủng hộ dài dài!',
        }
      });
    }
  }

  // 15. Orders and OrderDetails
  console.log('Đang xử lý Orders...');
  const employeeStaff = await prisma.employee.findFirst({ where: { Email: 'staff@phela.vn' } });
  const allTables = await prisma.shopTable.findMany();
  const allDrinkSizes = await prisma.drinkSize.findMany();
  const allCustomers = await prisma.customer.findMany();

  if (employeeStaff && allTables.length > 0 && allDrinkSizes.length > 0 && allCustomers.length > 0) {
    const orderCount = await prisma.orders.count();
    if (orderCount === 0) {
      console.log('Tạo dữ liệu đơn hàng ngẫu nhiên trong 6 tháng...');
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      for (let offset = 5; offset >= 0; offset--) {
        const targetMonth = currentMonth - offset;
        const year = targetMonth < 0 ? currentYear - 1 : currentYear;
        const normalizedMonth = targetMonth < 0 ? targetMonth + 12 : targetMonth;

        const numOrders = Math.floor(Math.random() * 10) + 5;
        
        for (let i = 0; i < numOrders; i++) {
          const randomDay = Math.floor(Math.random() * 28) + 1;
          const orderDate = new Date(year, normalizedMonth, randomDay, 14, 30, 0);

          const randomVal = Math.random();
          const orderType = randomVal < 0.6 ? 'DINE_IN' : (randomVal < 0.8 ? 'TAKE_AWAY' : 'DELIVERY');
          const paymentMethod = Math.random() < 0.7 ? 'BANKING' : 'CASH';

          const randomCustomer = allCustomers[Math.floor(Math.random() * allCustomers.length)]!;
          const randomTable = allTables[Math.floor(Math.random() * allTables.length)]!;

          const order = await prisma.orders.create({
            data: {
              CustomerID: randomCustomer.CustomerID,
              EmployeeID: employeeStaff.EmployeeID,
              ShopTableID: orderType === 'DINE_IN' ? randomTable.ShopTableID : null,
              OrderStatus: 'COMPLETED',
              OrderType: orderType,
              PaymentMethod: paymentMethod,
              PaymentStatus: 'COMPLETED', // Use COMPLETED for PaymentStatus
              TotalPrice: 0, // Will update below
              CreatedTime: orderDate,
              createdAt: orderDate,
              updatedAt: orderDate,
            }
          });

          let totalPrice = 0;
          // Tạo thiên vị (Bias): 35% hóa đơn sẽ cố tình mua chung Combo (DrinkSize 0 + DrinkSize 1) để thuật toán Apriori có cái học
          const isBiasedOrder = Math.random() < 0.35;
          let selectedSizes: any[] = [];

          if (isBiasedOrder && allDrinkSizes.length >= 3) {
            selectedSizes.push(allDrinkSizes[0], allDrinkSizes[1]);
            // 60% trong số đó mua thêm món thứ 3
            if (Math.random() < 0.6) selectedSizes.push(allDrinkSizes[2]);
          } else {
            const numDetails = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < numDetails; j++) {
              selectedSizes.push(allDrinkSizes[Math.floor(Math.random() * allDrinkSizes.length)]!);
            }
          }

          // Lọc trùng món trong 1 hóa đơn
          selectedSizes = Array.from(new Set(selectedSizes.map((s: any) => s?.DrinkSizeID)))
            .map((id: any) => selectedSizes.find((s: any) => s?.DrinkSizeID === id))
            .filter((s: any) => s !== undefined);

          for (const randomDS of selectedSizes) {
            const qty = Math.floor(Math.random() * 2) + 1;
            totalPrice += Number(randomDS.UnitPrice) * qty;

            await prisma.orderDetail.create({
              data: {
                OrderID: order.OrderID,
                DrinkSizeID: randomDS.DrinkSizeID,
                Quantity: qty,
                Sugar: '100%',
                Ice: '50%',
                UnitPrice: randomDS.UnitPrice,
                createdAt: orderDate,
                updatedAt: orderDate,
              }
            });
          }

          await prisma.orders.update({
            where: { OrderID: order.OrderID },
            data: { TotalPrice: totalPrice }
          });
        }
      }
    }
  }

  // 16. Carts
  console.log('Đang xử lý Carts...');
  const cartCount = await prisma.cart.count();
  if (cartCount === 0 && allCustomers.length > 0 && allDrinkSizes.length > 1) {
    const activeCart = await prisma.cart.create({
      data: {
        CustomerID: allCustomers[0]!.CustomerID,
        Status: 'ACTIVE',
      }
    });
    await prisma.cartItem.createMany({
      data: [
        { CartID: activeCart.CartID, DrinkSizeID: allDrinkSizes[0]!.DrinkSizeID, Quantity: 2, UnitPrice: allDrinkSizes[0]!.UnitPrice },
        { CartID: activeCart.CartID, DrinkSizeID: allDrinkSizes[1]!.DrinkSizeID, Quantity: 1, UnitPrice: allDrinkSizes[1]!.UnitPrice }
      ]
    });
  }

  // 17. Promotions & Vouchers
  console.log('Đang xử lý Promotions & Vouchers...');
  const promoCount = await prisma.promotion.count();
  if (promoCount === 0) {
    await prisma.promotion.createMany({
      data: [
        { Name: 'Giảm giá cuối tuần', Description: 'Giảm 10% cho tất cả món', Type: 'PERCENT', Value: 10, MinQuantity: 2, IsActive: true },
        { Name: 'Mua 2 tặng 1', Description: 'Giảm 30% khi mua trên 3 món', Type: 'PERCENT', Value: 30, MinQuantity: 3, IsActive: true }
      ]
    });
  }

  const voucherCount = await prisma.voucher.count();
  if (voucherCount === 0 && allCustomers.length > 0) {
    await prisma.voucher.createMany({
      data: [
        { Code: 'WELCOME', DiscountType: 'PERCENT', DiscountValue: 10, Creator: 'ADMIN' },
        { Code: 'VIP', DiscountType: 'AMOUNT', DiscountValue: 20000, Creator: 'ADMIN', OwnerID: allCustomers[0]!.CustomerID }
      ]
    });
  }

  // 18. Chat Sessions
  console.log('Đang xử lý Chat Sessions...');
  const chatCount = await prisma.chatSession.count();
  if (chatCount === 0 && allCustomers.length > 0) {
    const session = await prisma.chatSession.create({
      data: {
        CustomerID: allCustomers[0]!.CustomerID,
        Status: 'AI_HANDLING',
      }
    });
    await prisma.chatMessage.createMany({
      data: [
        { SessionID: session.SessionID, SenderType: 'CUSTOMER', Content: 'Cho tôi hỏi trà nào ngon nhất?' },
        { SessionID: session.SessionID, SenderType: 'AI', Content: 'Dạ quán có món Ô Long Nhài Sữa đang bán rất chạy ạ!' }
      ]
    });
  }

  // 19. Salary & ShiftLog
  console.log('Đang xử lý Salary & ShiftLog...');
  const shiftLogCount = await prisma.shiftLog.count();
  const allShifts = await prisma.shift.findMany();
  const targetEmployeeForSalary = await prisma.employee.findFirst({ where: { Email: 'staff@phela.vn' } });

  if (shiftLogCount === 0 && targetEmployeeForSalary && allShifts.length > 0) {
    await prisma.shiftLog.create({
      data: {
        EmployeeID: targetEmployeeForSalary.EmployeeID,
        ShiftID: allShifts[0]!.ShiftID,
        WorkDate: new Date(),
        CheckInTime: new Date(),
        ShiftStatus: 'WORKING'
      }
    });
  }

  const salaryCount = await prisma.salary.count();
  if (salaryCount === 0 && targetEmployeeForSalary) {
    await prisma.salary.create({
      data: {
        EmployeeID: targetEmployeeForSalary.EmployeeID,
        Month: new Date().getMonth() + 1,
        Year: new Date().getFullYear(),
        BaseSalary: 30000,
        TotalHours: 40,
        Bonus: 500000,
        Deduction: 0,
        RealSalary: 30000 * 40 + 500000
      }
    });
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
