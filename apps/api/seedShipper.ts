import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Shipper Role and Employee...');

  // 1. Create Shipper Role if not exists
  let shipperRole = await prisma.employeeRole.findFirst({
    where: { RoleName: 'Shipper' },
  });

  if (!shipperRole) {
    shipperRole = await prisma.employeeRole.create({
      data: {
        RoleName: 'Shipper',
        Description: 'Nhân viên giao hàng nội bộ',
        DefaultBaseSalary: 6000000,
      },
    });
    console.log('Created Shipper Role.');
  }

  // 2. Update Shipper Employee with hashed password
  const hashedPassword = bcrypt.hashSync('password123', 10);
  
  const existingShipper = await prisma.employee.findFirst({
    where: { PINCode: '9999' }
  });

  if (existingShipper) {
    await prisma.employee.update({
      where: { EmployeeID: existingShipper.EmployeeID },
      data: { password: hashedPassword }
    });
    console.log('Updated existing Shipper Employee with hashed password.');
  } else {
    await prisma.employee.create({
      data: {
        FullName: 'Trần Tài Xế',
        PhoneNumber: '0999999999',
        Email: 'shipper@phela.vn',
        Birth: new Date('1999-01-01'),
        Sex: 'MALE',
        PINCode: '9999', 
        password: hashedPassword,
        RoleID: shipperRole.RoleID,
      },
    });
    console.log('Created new Shipper Employee with hashed password.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
