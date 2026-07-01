import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { upgradeCustomerLevel } from '../customers/customers.router';

const router = Router();

// Zod schemas
const bookThirdPartySchema = z.object({
  OrderID: z.number().int().positive(),
});

const assignShipperSchema = z.object({
  OrderID: z.number().int().positive(),
  ShipperID: z.number().int().positive(),
});

const updateStatusSchema = z.object({
  OrderID: z.number().int().positive(),
  OrderStatus: z.enum(['SHIPPING', 'COMPLETED', 'CANCELLED']),
});

// Mock 3rd-party delivery integration
router.post('/book-third-party', verifyJWT, requireRole(['ADMIN', 'MANAGER', 'STAFF']), async (req, res, next) => {
  try {
    const { OrderID } = bookThirdPartySchema.parse(req.body);

    const order = await prisma.orders.findUnique({
      where: { OrderID },
    });

    if (!order) {
      throw new AppError(404, 'Đơn hàng không tồn tại.');
    }

    if (order.OrderType !== 'DELIVERY') {
      throw new AppError(400, 'Chỉ có đơn giao hàng mới có thể gọi shipper.');
    }

    // Simulate finding a driver (delay 2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate Mock Driver Info
    const driverNames = ['Nguyễn Văn Grab', 'Trần Thị Ahamove', 'Lê Be', 'Phạm XanhSM'];
    const randomName = driverNames[Math.floor(Math.random() * driverNames.length)];
    const randomPhone = `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const trackingCode = `TRACK-${Math.floor(Math.random() * 1000000)}`;

    const updatedOrder = await prisma.orders.update({
      where: { OrderID },
      data: {
        OrderStatus: 'SHIPPING',
        DeliveryMethod: 'THIRD_PARTY',
        ThirdPartyShipperName: randomName,
        ThirdPartyShipperPhone: randomPhone,
        TrackingURL: `https://mock-tracking.phela.vn/${trackingCode}`,
      },
    });

    return sendResponse(res, 200, true, 'Đã tìm thấy tài xế và gọi bên thứ 3 thành công.', updatedOrder);
  } catch (error) {
    next(error);
  }
});

// Assign Internal Shipper
router.post('/assign-shipper', verifyJWT, requireRole(['ADMIN', 'MANAGER', 'STAFF']), async (req, res, next) => {
  try {
    const { OrderID, ShipperID } = assignShipperSchema.parse(req.body);

    const shipper = await prisma.employee.findUnique({
      where: { EmployeeID: ShipperID },
      include: { Role: true }
    });

    if (!shipper) {
      throw new AppError(404, 'Nhân viên giao hàng không tồn tại.');
    }

    const updatedOrder = await prisma.orders.update({
      where: { OrderID },
      data: {
        OrderStatus: 'SHIPPING',
        DeliveryMethod: 'INTERNAL',
        ShipperID: ShipperID,
      },
    });

    return sendResponse(res, 200, true, 'Đã gán đơn hàng cho nhân viên giao hàng.', updatedOrder);
  } catch (error) {
    next(error);
  }
});

// Get My Assigned Orders (For Shipper Role)
router.get('/my-orders', verifyJWT, async (req: any, res, next) => {
  try {
    const employeeId = req.user?.EmployeeID;
    if (!employeeId) throw new AppError(401, 'Unauthorized');

    const orders = await prisma.orders.findMany({
      where: {
        ShipperID: employeeId,
        OrderStatus: { in: ['SHIPPING', 'COMPLETED'] }, // usually active orders
      },
      orderBy: { CreatedTime: 'desc' },
      include: {
        Customer: true,
        OrderDetails: {
          include: { DrinkSize: { include: { Drink: true, Size: true } } }
        }
      }
    });

    return sendResponse(res, 200, true, 'Lấy danh sách đơn hàng được gán thành công.', orders);
  } catch (error) {
    next(error);
  }
});

// Update Order Status (For Shipper or Admin)
router.post('/update-status', verifyJWT, async (req: any, res, next) => {
  try {
    const { OrderID, OrderStatus } = updateStatusSchema.parse(req.body);

    const order = await prisma.orders.findUnique({
      where: { OrderID },
    });
    if (!order) throw new AppError(404, 'Đơn hàng không tồn tại.');
    if (order.OrderStatus === 'COMPLETED') throw new AppError(400, 'Cannot change the status of an already completed order.');
    if (order.OrderStatus === 'CANCELLED') throw new AppError(400, 'Cannot change the status of an already cancelled order.');

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.orders.update({
        where: { OrderID },
        data: { OrderStatus },
      });

      if (OrderStatus === 'COMPLETED' && order.CustomerID) {
        await tx.customer.update({
          where: { CustomerID: order.CustomerID },
          data: {
            TotalMoneySpending: {
              increment: order.TotalPrice,
            },
          },
        });
        await upgradeCustomerLevel(order.CustomerID, tx);
      }
      
      return updated;
    });

    return sendResponse(res, 200, true, 'Cập nhật trạng thái đơn hàng thành công.', updatedOrder);
  } catch (error) {
    next(error);
  }
});

// Get My Assigned Receipts (For Shipper Role)
router.get('/my-receipts', verifyJWT, async (req: any, res, next) => {
  try {
    const employeeId = req.user?.EmployeeID;
    if (!employeeId) throw new AppError(401, 'Unauthorized');

    const receipts = await prisma.ingredientReceipt.findMany({
      where: {
        ShipperID: employeeId,
        IngredientReceiptStatus: { in: ['SHIPPING', 'CONFIRMED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Supplier: true,
        IngredientReceiptDetails: {
          include: { Ingredient: true }
        }
      }
    });

    return sendResponse(res, 200, true, 'Lấy danh sách phiếu nhập kho được gán thành công.', receipts);
  } catch (error) {
    next(error);
  }
});

const updateReceiptStatusSchema = z.object({
  IngredientReceiptID: z.number().int().positive(),
  Status: z.enum(['CONFIRMED']),
});

// Update Receipt Status (For Shipper) - Sets CONFIRMED and updates stock
router.post('/update-receipt-status', verifyJWT, async (req: any, res, next) => {
  try {
    const { IngredientReceiptID, Status } = updateReceiptStatusSchema.parse(req.body);

    const receipt = await prisma.ingredientReceipt.findUnique({
      where: { IngredientReceiptID },
      include: { IngredientReceiptDetails: true },
    });

    if (!receipt) throw new AppError(404, 'Receipt not found.');
    if (receipt.IngredientReceiptStatus === 'CONFIRMED') {
      throw new AppError(400, 'This receipt is already confirmed.');
    }

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      // 1. Loop details and increase stocks
      for (const item of receipt.IngredientReceiptDetails) {
        await tx.ingredient.update({
          where: { IngredientID: item.IngredientID },
          data: {
            QuantityStock: {
              increment: item.Quantity,
            },
          },
        });
      }

      // 2. Set status to confirmed
      return tx.ingredientReceipt.update({
        where: { IngredientReceiptID },
        data: {
          IngredientReceiptStatus: 'CONFIRMED',
        },
      });
    });

    return sendResponse(res, 200, true, 'Cập nhật trạng thái phiếu nhập và nhập kho thành công.', updatedReceipt);
  } catch (error) {
    next(error);
  }
});

export default router;
