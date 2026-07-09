import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { upgradeCustomerLevel } from '../customers/customers.router';
import { processOrderIngredients } from '../orders/orders.router';
import { GhnService } from '../shipping/ghn.service';

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
      include: {
        OrderDetails: {
          include: { DrinkSize: { include: { Drink: true } } }
        }
      }
    });

    if (!order) {
      throw new AppError(404, 'Đơn hàng không tồn tại.');
    }

    if (order.OrderType !== 'DELIVERY') {
      throw new AppError(400, 'Chỉ có đơn giao hàng mới có thể gọi shipper.');
    }
    
    if (!order.DistrictID || !order.WardCode) {
      throw new AppError(400, 'Đơn hàng thiếu thông tin địa chỉ GHN (Quận/Huyện, Phường/Xã).');
    }

    const items = order.OrderDetails.map((detail: any) => ({
      name: detail.DrinkSize.Drink.DrinkName,
      quantity: detail.Quantity,
      price: Number(detail.UnitPrice),
      weight: 500, // 500g per cup default
    }));

    const totalWeight = items.reduce((acc, curr) => acc + (curr.quantity * curr.weight), 0);
    const codAmount = order.PaymentMethod === 'COD' && order.PaymentStatus !== 'PAID' ? Number(order.TotalPrice) : 0;

    // Call GHN Create Order
    const ghnOrderCode = await GhnService.createOrder({
      to_name: order.ReceiverName || 'Khách hàng Phê La',
      to_phone: order.ReceiverPhone || '0901234567',
      to_address: order.ShippingAddress || '',
      to_ward_code: order.WardCode,
      to_district_id: order.DistrictID,
      weight: totalWeight,
      insurance_value: Number(order.TotalPrice),
      cod_amount: codAmount,
      content: `Phê La Order #${order.OrderID}`,
      items: items,
    });

    const trackingURL = `https://tracking.ghn.vn/?bicode=${ghnOrderCode}`;

    const updatedOrder = await prisma.orders.update({
      where: { OrderID },
      data: {
        OrderStatus: 'SHIPPING',
        DeliveryMethod: 'THIRD_PARTY',
        GHN_OrderCode: ghnOrderCode,
        TrackingURL: trackingURL,
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

    const order = await prisma.orders.findUnique({ where: { OrderID } });
    if (!order) throw new AppError(404, 'Đơn hàng không tồn tại.');
    if (order.OrderStatus === 'COMPLETED' || order.OrderStatus === 'CANCELLED') {
      throw new AppError(400, 'Không thể gán Shipper cho đơn hàng đã Hoàn thành hoặc Đã hủy.');
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
router.post('/update-status', verifyJWT, requireRole(['ADMIN', 'MANAGER', 'SHIPPER']), async (req: any, res, next) => {
  try {
    const { OrderID, OrderStatus } = updateStatusSchema.parse(req.body);

    const order = await prisma.orders.findUnique({
      where: { OrderID },
      include: { OrderDetails: true },
    });
    if (!order) throw new AppError(404, 'Đơn hàng không tồn tại.');
    
    // Authorization check: Only Admin/Manager can update any order. Shippers can only update their assigned orders.
    const userRole = req.user.Role?.RoleName;
    if (userRole === 'SHIPPER' && order.ShipperID !== req.user.EmployeeID) {
      throw new AppError(403, 'Bạn không có quyền cập nhật đơn hàng của tài xế khác.');
    }
    if (order.OrderStatus === 'COMPLETED') throw new AppError(400, 'Cannot change the status of an already completed order.');
    if (order.OrderStatus === 'CANCELLED') throw new AppError(400, 'Cannot change the status of an already cancelled order.');

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.orders.update({
        where: { OrderID },
        data: { OrderStatus },
      });

      if (OrderStatus === 'COMPLETED') {
        const itemsToDeduct = order.OrderDetails.map((detail) => ({
          DrinkSizeID: detail.DrinkSizeID,
          Quantity: detail.Quantity,
        }));
        await processOrderIngredients(tx, itemsToDeduct, 'deduct');

        if (order.CustomerID) {
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
    
    if (req.user.EmployeeID !== receipt.ShipperID) {
      throw new AppError(403, 'Bạn không được phép xác nhận phiếu nhập kho của người khác.');
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
