/*
  Warnings:

  - The primary key for the `OrderDetail` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `OrderDetailID` to the `OrderDetail` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Drink] ADD [IsFeatured] BIT NOT NULL CONSTRAINT [Drink_IsFeatured_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[IngredientReceipt] ADD [Latitude] FLOAT(53),
[Longitude] FLOAT(53),
[ShipperID] INT,
[ShippingAddress] NVARCHAR(255);

-- AlterTable
ALTER TABLE [dbo].[OrderDetail] DROP CONSTRAINT [OrderDetail_pkey];
ALTER TABLE [dbo].[OrderDetail] ADD [Ice] VARCHAR(20) NOT NULL CONSTRAINT [OrderDetail_Ice_df] DEFAULT '100%',
[OrderDetailID] INT NOT NULL IDENTITY(1,1),
[Sugar] VARCHAR(20) NOT NULL CONSTRAINT [OrderDetail_Sugar_df] DEFAULT '100%',
[Toppings] NVARCHAR(500);
ALTER TABLE [dbo].[OrderDetail] ADD CONSTRAINT OrderDetail_pkey PRIMARY KEY CLUSTERED ([OrderDetailID]);

-- AlterTable
ALTER TABLE [dbo].[Orders] ADD [AppTransId] VARCHAR(100),
[DeliveryMethod] VARCHAR(50),
[Distance] FLOAT(53),
[Latitude] FLOAT(53),
[Longitude] FLOAT(53),
[OrderType] VARCHAR(50) NOT NULL CONSTRAINT [Orders_OrderType_df] DEFAULT 'DINE_IN',
[PaymentMethod] VARCHAR(50),
[PaymentStatus] VARCHAR(50),
[ReceiverName] NVARCHAR(255),
[ReceiverPhone] VARCHAR(20),
[RefundReason] NVARCHAR(500),
[RefundStatus] VARCHAR(50),
[ShipperID] INT,
[ShippingAddress] NVARCHAR(255),
[ShippingFee] DECIMAL(10,2) CONSTRAINT [Orders_ShippingFee_df] DEFAULT 0,
[ThirdPartyShipperName] NVARCHAR(255),
[ThirdPartyShipperPhone] VARCHAR(20),
[TrackingURL] VARCHAR(500);

-- CreateTable
CREATE TABLE [dbo].[Cart] (
    [CartID] INT NOT NULL IDENTITY(1,1),
    [SessionID] VARCHAR(100),
    [CustomerID] INT,
    [Status] VARCHAR(50) NOT NULL CONSTRAINT [Cart_Status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Cart_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Cart_pkey] PRIMARY KEY CLUSTERED ([CartID])
);

-- CreateTable
CREATE TABLE [dbo].[CartItem] (
    [CartItemID] INT NOT NULL IDENTITY(1,1),
    [CartID] INT NOT NULL,
    [DrinkSizeID] INT NOT NULL,
    [Quantity] INT NOT NULL,
    [Sugar] VARCHAR(20) NOT NULL CONSTRAINT [CartItem_Sugar_df] DEFAULT '100%',
    [Ice] VARCHAR(20) NOT NULL CONSTRAINT [CartItem_Ice_df] DEFAULT '100%',
    [Toppings] NVARCHAR(500),
    [UnitPrice] DECIMAL(10,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CartItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [CartItem_pkey] PRIMARY KEY CLUSTERED ([CartItemID])
);

-- CreateTable
CREATE TABLE [dbo].[Review] (
    [ReviewID] INT NOT NULL IDENTITY(1,1),
    [CustomerID] INT NOT NULL,
    [DrinkID] INT NOT NULL,
    [OrderID] INT,
    [Rating] TINYINT NOT NULL,
    [Comment] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Review_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Review_pkey] PRIMARY KEY CLUSTERED ([ReviewID])
);

-- CreateTable
CREATE TABLE [dbo].[ChatSession] (
    [SessionID] UNIQUEIDENTIFIER NOT NULL,
    [CustomerID] INT,
    [Status] VARCHAR(50) NOT NULL CONSTRAINT [ChatSession_Status_df] DEFAULT 'AI_HANDLING',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ChatSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ChatSession_pkey] PRIMARY KEY CLUSTERED ([SessionID])
);

-- CreateTable
CREATE TABLE [dbo].[ChatMessage] (
    [MessageID] INT NOT NULL IDENTITY(1,1),
    [SessionID] UNIQUEIDENTIFIER NOT NULL,
    [SenderType] VARCHAR(20) NOT NULL,
    [Content] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ChatMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ChatMessage_pkey] PRIMARY KEY CLUSTERED ([MessageID])
);

-- AddForeignKey
ALTER TABLE [dbo].[IngredientReceipt] ADD CONSTRAINT [FK_IngredientReceipt_Shipper] FOREIGN KEY ([ShipperID]) REFERENCES [dbo].[Employee]([EmployeeID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Orders] ADD CONSTRAINT [FK_Orders_Shipper] FOREIGN KEY ([ShipperID]) REFERENCES [dbo].[Employee]([EmployeeID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Cart] ADD CONSTRAINT [FK_Cart_Customer] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customer]([CustomerID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CartItem] ADD CONSTRAINT [FK_CartItem_Cart] FOREIGN KEY ([CartID]) REFERENCES [dbo].[Cart]([CartID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CartItem] ADD CONSTRAINT [FK_CartItem_DrinkSize] FOREIGN KEY ([DrinkSizeID]) REFERENCES [dbo].[DrinkSize]([DrinkSizeID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [FK_Review_Customer] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customer]([CustomerID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [FK_Review_Drink] FOREIGN KEY ([DrinkID]) REFERENCES [dbo].[Drink]([DrinkID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [FK_Review_Order] FOREIGN KEY ([OrderID]) REFERENCES [dbo].[Orders]([OrderID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChatSession] ADD CONSTRAINT [FK_ChatSession_Customer] FOREIGN KEY ([CustomerID]) REFERENCES [dbo].[Customer]([CustomerID]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ChatMessage] ADD CONSTRAINT [FK_ChatMessage_ChatSession] FOREIGN KEY ([SessionID]) REFERENCES [dbo].[ChatSession]([SessionID]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
