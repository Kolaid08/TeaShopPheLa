BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Drink] (
    [DrinkID] INT NOT NULL IDENTITY(1,1),
    [DrinkName] NVARCHAR(1000) NOT NULL,
    [DrinkDescription] NVARCHAR(max),
    [DrinkImageURL] VARCHAR(2048),
    [DrinkStatus] VARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Drink_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Drink_pkey] PRIMARY KEY CLUSTERED ([DrinkID])
);

-- CreateTable
CREATE TABLE [dbo].[Size] (
    [SizeID] INT NOT NULL IDENTITY(1,1),
    [SizeName] VARCHAR(50) NOT NULL,
    [Description] NVARCHAR(255),
    [VolumeML] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Size_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Size_pkey] PRIMARY KEY CLUSTERED ([SizeID])
);

-- CreateTable
CREATE TABLE [dbo].[DrinkSize] (
    [DrinkSizeID] INT NOT NULL IDENTITY(1,1),
    [DrinkID] INT NOT NULL,
    [SizeID] INT NOT NULL,
    [UnitPrice] DECIMAL(10,2) NOT NULL,
    [DrinkSizeStatus] VARCHAR(50) NOT NULL CONSTRAINT [DrinkSize_DrinkSizeStatus_df] DEFAULT 'AVAILABLE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DrinkSize_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DrinkSize_pkey] PRIMARY KEY CLUSTERED ([DrinkSizeID])
);

-- CreateTable
CREATE TABLE [dbo].[Recipe] (
    [RecipeID] INT NOT NULL IDENTITY(1,1),
    [DrinkID] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Recipe_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Recipe_pkey] PRIMARY KEY CLUSTERED ([RecipeID])
);

-- CreateTable
CREATE TABLE [dbo].[Ingredient] (
    [IngredientID] INT NOT NULL IDENTITY(1,1),
    [IngredientName] NVARCHAR(255) NOT NULL,
    [QuantityStock] DECIMAL(10,2) NOT NULL,
    [UnitID] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Ingredient_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Ingredient_pkey] PRIMARY KEY CLUSTERED ([IngredientID])
);

-- CreateTable
CREATE TABLE [dbo].[Unit] (
    [UnitID] INT NOT NULL IDENTITY(1,1),
    [UnitName] NVARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Unit_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Unit_pkey] PRIMARY KEY CLUSTERED ([UnitID])
);

-- CreateTable
CREATE TABLE [dbo].[RecipeDetail] (
    [RecipeID] INT NOT NULL,
    [IngredientID] INT NOT NULL,
    [Quantity] DECIMAL(10,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RecipeDetail_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RecipeDetail_pkey] PRIMARY KEY CLUSTERED ([RecipeID],[IngredientID])
);

-- CreateTable
CREATE TABLE [dbo].[Supplier] (
    [SupplierID] INT NOT NULL IDENTITY(1,1),
    [SupplierName] NVARCHAR(255) NOT NULL,
    [SupplierEmail] VARCHAR(255) NOT NULL,
    [Street] NVARCHAR(255),
    [AddressNumber] NVARCHAR(50),
    [City] NVARCHAR(100),
    [District] NVARCHAR(100),
    [Ward] NVARCHAR(100),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Supplier_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Supplier_pkey] PRIMARY KEY CLUSTERED ([SupplierID])
);

-- CreateTable
CREATE TABLE [dbo].[SupplierPhone] (
    [SupplierPhoneID] INT NOT NULL IDENTITY(1,1),
    [SupplierID] INT NOT NULL,
    [PhoneNumber] VARCHAR(20) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupplierPhone_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SupplierPhone_pkey] PRIMARY KEY CLUSTERED ([SupplierPhoneID])
);

-- CreateTable
CREATE TABLE [dbo].[IngredientReceipt] (
    [IngredientReceiptID] INT NOT NULL IDENTITY(1,1),
    [SupplierID] INT NOT NULL,
    [ReceivedDate] DATETIME2 NOT NULL,
    [IngredientReceiptStatus] VARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IngredientReceipt_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [IngredientReceipt_pkey] PRIMARY KEY CLUSTERED ([IngredientReceiptID])
);

-- CreateTable
CREATE TABLE [dbo].[IngredientReceiptDetail] (
    [IngredientReceiptID] INT NOT NULL,
    [IngredientID] INT NOT NULL,
    [Quantity] DECIMAL(10,2) NOT NULL,
    [CostPrice] DECIMAL(10,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IngredientReceiptDetail_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [IngredientReceiptDetail_pkey] PRIMARY KEY CLUSTERED ([IngredientReceiptID],[IngredientID])
);

-- CreateTable
CREATE TABLE [dbo].[MemberShipLevel] (
    [LevelID] INT NOT NULL IDENTITY(1,1),
    [LevelName] NVARCHAR(50) NOT NULL,
    [DiscountRate] DECIMAL(5,2) NOT NULL,
    [RequiredMoney] DECIMAL(15,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MemberShipLevel_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [MemberShipLevel_pkey] PRIMARY KEY CLUSTERED ([LevelID])
);

-- CreateTable
CREATE TABLE [dbo].[Customer] (
    [CustomerID] INT NOT NULL IDENTITY(1,1),
    [CustomerName] NVARCHAR(255) NOT NULL,
    [Email] VARCHAR(255),
    [PhoneNumber] VARCHAR(20) NOT NULL,
    [TotalMoneySpending] DECIMAL(15,2) NOT NULL,
    [LevelID] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Customer_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Customer_pkey] PRIMARY KEY CLUSTERED ([CustomerID])
);

-- CreateTable
CREATE TABLE [dbo].[ShopTable] (
    [ShopTableID] INT NOT NULL IDENTITY(1,1),
    [ShopTableNumber] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ShopTable_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ShopTable_pkey] PRIMARY KEY CLUSTERED ([ShopTableID])
);

-- CreateTable
CREATE TABLE [dbo].[Orders] (
    [OrderID] INT NOT NULL IDENTITY(1,1),
    [CustomerID] INT,
    [ShopTableID] INT,
    [EmployeeID] INT NOT NULL,
    [CreatedTime] DATETIME2 NOT NULL CONSTRAINT [Orders_CreatedTime_df] DEFAULT CURRENT_TIMESTAMP,
    [OrderStatus] VARCHAR(50) NOT NULL CONSTRAINT [Orders_OrderStatus_df] DEFAULT 'PENDING',
    [TotalPrice] DECIMAL(10,2) NOT NULL,
    [OrderNote] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Orders_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Orders_pkey] PRIMARY KEY CLUSTERED ([OrderID])
);

-- CreateTable
CREATE TABLE [dbo].[OrderDetail] (
    [OrderID] INT NOT NULL,
    [DrinkSizeID] INT NOT NULL,
    [Quantity] INT NOT NULL,
    [UnitPrice] DECIMAL(10,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OrderDetail_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OrderDetail_pkey] PRIMARY KEY CLUSTERED ([OrderID],[DrinkSizeID])
);

-- CreateTable
CREATE TABLE [dbo].[Employee] (
    [EmployeeID] INT NOT NULL IDENTITY(1,1),
    [FullName] NVARCHAR(255) NOT NULL,
    [PhoneNumber] VARCHAR(20) NOT NULL,
    [Email] VARCHAR(255) NOT NULL,
    [Birth] DATETIME2 NOT NULL,
    [Sex] VARCHAR(20) NOT NULL,
    [PINCode] VARCHAR(10) NOT NULL,
    [password] VARCHAR(255) NOT NULL,
    [RoleID] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Employee_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([EmployeeID])
);

-- CreateTable
CREATE TABLE [dbo].[EmployeeRole] (
    [RoleID] INT NOT NULL IDENTITY(1,1),
    [RoleName] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(255),
    [DefaultBaseSalary] DECIMAL(15,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmployeeRole_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [EmployeeRole_pkey] PRIMARY KEY CLUSTERED ([RoleID])
);

-- CreateTable
CREATE TABLE [dbo].[Salary] (
    [SalaryID] INT NOT NULL IDENTITY(1,1),
    [EmployeeID] INT NOT NULL,
    [Month] INT NOT NULL,
    [Year] INT NOT NULL,
    [BaseSalary] DECIMAL(15,2) NOT NULL,
    [TotalHours] DECIMAL(6,2) NOT NULL,
    [Bonus] DECIMAL(15,2) NOT NULL,
    [Deduction] DECIMAL(15,2) NOT NULL,
    [RealSalary] DECIMAL(15,2) NOT NULL,
    [PaidDate] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Salary_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Salary_pkey] PRIMARY KEY CLUSTERED ([SalaryID])
);

-- CreateTable
CREATE TABLE [dbo].[Shift] (
    [ShiftID] INT NOT NULL IDENTITY(1,1),
    [ShiftName] NVARCHAR(100) NOT NULL,
    [StartTime] VARCHAR(10) NOT NULL,
    [EndTime] VARCHAR(10) NOT NULL,
    [Note] NVARCHAR(255),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Shift_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Shift_pkey] PRIMARY KEY CLUSTERED ([ShiftID])
);

-- CreateTable
CREATE TABLE [dbo].[ShiftLog] (
    [ShiftLogID] INT NOT NULL IDENTITY(1,1),
    [EmployeeID] INT NOT NULL,
    [ShiftID] INT NOT NULL,
    [WorkDate] DATETIME2 NOT NULL,
    [CheckInTime] DATETIME2,
    [CheckOutTime] DATETIME2,
    [ShiftStatus] VARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ShiftLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ShiftLog_pkey] PRIMARY KEY CLUSTERED ([ShiftLogID])
);

-- AddForeignKey
ALTER TABLE [dbo].[DrinkSize] ADD CONSTRAINT [FK_DrinkSize_Drink] FOREIGN KEY ([DrinkID]) REFERENCES [dbo].[Drink]([DrinkID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DrinkSize] ADD CONSTRAINT [FK_DrinkSize_Size] FOREIGN KEY ([SizeID]) REFERENCES [dbo].[Size]([SizeID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Recipe] ADD CONSTRAINT [FK_Recipe_Drink] FOREIGN KEY ([DrinkID]) REFERENCES [dbo].[Drink]([DrinkID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Ingredient] ADD CONSTRAINT [FK_Ingredient_Unit] FOREIGN KEY ([UnitID]) REFERENCES [dbo].[Unit]([UnitID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecipeDetail] ADD CONSTRAINT [FK_RecipeDetail_Recipe] FOREIGN KEY ([RecipeID]) REFERENCES [dbo].[Recipe]([RecipeID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecipeDetail] ADD CONSTRAINT [FK_RecipeDetail_Ingredient] FOREIGN KEY ([IngredientID]) REFERENCES [dbo].[Ingredient]([IngredientID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SupplierPhone] ADD CONSTRAINT [FK_SupplierPhone_Supplier] FOREIGN KEY ([SupplierID]) REFERENCES [dbo].[Supplier]([SupplierID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[IngredientReceipt] ADD CONSTRAINT [FK_IngredientReceipt_Supplier] FOREIGN KEY ([SupplierID]) REFERENCES [dbo].[Supplier]([SupplierID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[IngredientReceiptDetail] ADD CONSTRAINT [FK_IngredientReceiptDetail_IngredientReceipt] FOREIGN KEY ([IngredientReceiptID]) REFERENCES [dbo].[IngredientReceipt]([IngredientReceiptID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[IngredientReceiptDetail] ADD CONSTRAINT [FK_IngredientReceiptDetail_Ingredient] FOREIGN KEY ([IngredientID]) REFERENCES [dbo].[Ingredient]([IngredientID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Customer] ADD CONSTRAINT [FK_Customer_MemberShipLevel] FOREIGN KEY ([LevelID]) REFERENCES [dbo].[MemberShipLevel]([LevelID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Orders] ADD CONSTRAINT [FK_Orders_Customer] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customer]([CustomerID]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Orders] ADD CONSTRAINT [FK_Orders_ShopTable] FOREIGN KEY ([ShopTableID]) REFERENCES [dbo].[ShopTable]([ShopTableID]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Orders] ADD CONSTRAINT [FK_Orders_Employee] FOREIGN KEY ([EmployeeID]) REFERENCES [dbo].[Employee]([EmployeeID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OrderDetail] ADD CONSTRAINT [FK_OrderDetail_Orders] FOREIGN KEY ([OrderID]) REFERENCES [dbo].[Orders]([OrderID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OrderDetail] ADD CONSTRAINT [FK_OrderDetail_DrinkSize] FOREIGN KEY ([DrinkSizeID]) REFERENCES [dbo].[DrinkSize]([DrinkSizeID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [FK_Employee_EmployeeRole] FOREIGN KEY ([RoleID]) REFERENCES [dbo].[EmployeeRole]([RoleID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Salary] ADD CONSTRAINT [FK_Salary_Employee] FOREIGN KEY ([EmployeeID]) REFERENCES [dbo].[Employee]([EmployeeID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ShiftLog] ADD CONSTRAINT [FK_ShiftLog_Employee] FOREIGN KEY ([EmployeeID]) REFERENCES [dbo].[Employee]([EmployeeID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ShiftLog] ADD CONSTRAINT [FK_ShiftLog_Shift] FOREIGN KEY ([ShiftID]) REFERENCES [dbo].[Shift]([ShiftID]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
