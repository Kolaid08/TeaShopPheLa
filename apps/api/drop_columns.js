const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Dropping Voucher.IsUsed constraint and column...");
    await prisma.$executeRawUnsafe(`
      DECLARE @ConstraintName nvarchar(200)
      SELECT @ConstraintName = Name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('Voucher') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('Voucher') AND name = 'IsUsed')
      IF @ConstraintName IS NOT NULL
      BEGIN
        EXEC('ALTER TABLE Voucher DROP CONSTRAINT ' + @ConstraintName)
      END
      ALTER TABLE Voucher DROP COLUMN IsUsed
    `);
  } catch (err) { console.log(err.message); }

  try {
    console.log("Dropping OrderDetail.Toppings constraint and column...");
    await prisma.$executeRawUnsafe(`
      DECLARE @ConstraintName2 nvarchar(200)
      SELECT @ConstraintName2 = Name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('OrderDetail') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('OrderDetail') AND name = 'Toppings')
      IF @ConstraintName2 IS NOT NULL
      BEGIN
        EXEC('ALTER TABLE OrderDetail DROP CONSTRAINT ' + @ConstraintName2)
      END
      ALTER TABLE OrderDetail DROP COLUMN Toppings
    `);
  } catch (err) { console.log(err.message); }

  try {
    console.log("Dropping CartItem.Toppings constraint and column...");
    await prisma.$executeRawUnsafe(`
      DECLARE @ConstraintName3 nvarchar(200)
      SELECT @ConstraintName3 = Name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('CartItem') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('CartItem') AND name = 'Toppings')
      IF @ConstraintName3 IS NOT NULL
      BEGIN
        EXEC('ALTER TABLE CartItem DROP CONSTRAINT ' + @ConstraintName3)
      END
      ALTER TABLE CartItem DROP COLUMN Toppings
    `);
  } catch (err) { console.log(err.message); }
}

main().then(()=>console.log("Done")).catch(console.error).finally(()=>prisma.$disconnect());
