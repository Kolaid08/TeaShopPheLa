import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { upgradeCustomerLevel } from '../customers/customers.router';
import { payos } from '../payment/payment.controller';

const router = Router();

const orderItemSchema = z.object({
  DrinkSizeID: z.number().int(),
  Quantity: z.number().int().positive(),
  Sugar: z.string().optional(),
  Ice: z.string().optional(),
  Toppings: z.string().optional(),
  UnitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  CustomerID: z.number().int().optional().nullable(),
  CustomerName: z.string().optional().nullable(),
  CustomerPhoneNumber: z.string().optional().nullable(),
  ShopTableID: z.number().int().optional().nullable(),
  OrderNote: z.string().max(500).optional().nullable(),
  Items: z.array(orderItemSchema).min(1),
  TotalPrice: z.number().positive().optional(),
  OrderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).optional(),
  ShippingAddress: z.string().optional().nullable(),
  Latitude: z.number().optional().nullable(),
  Longitude: z.number().optional().nullable(),
  ReceiverName: z.string().optional().nullable(),
  ReceiverPhone: z.string().optional().nullable(),
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

const updateStatusSchema = z.object({
  OrderStatus: z.enum(['PENDING', 'PREPARING', 'SHIPPING', 'COMPLETED', 'CANCELLED']),
});

const assignShipperSchema = z.object({
  ShipperID: z.number().int().optional().nullable(),
  DeliveryMethod: z.enum(['INTERNAL', 'THIRD_PARTY']),
  ThirdPartyShipperName: z.string().optional().nullable(),
  ThirdPartyShipperPhone: z.string().optional().nullable(),
  TrackingURL: z.string().optional().nullable(),
});

// Static catalog mapping of DrinkSizeID to DrinkName/Size/Price details for offline mock database representation
const mockDrinkSizesMap: Record<number, { DrinkName: string; SizeName: string; UnitPrice: number }> = {
  1: { DrinkName: 'Trà Ô Long sữa Phêla', SizeName: 'S', UnitPrice: 45000 },
  2: { DrinkName: 'Trà Ô Long sữa Phêla', SizeName: 'M', UnitPrice: 55000 },
  3: { DrinkName: 'Trà Ô Long sữa Phêla', SizeName: 'L', UnitPrice: 65000 },
  4: { DrinkName: 'Trà sữa Oolong Nhài', SizeName: 'M', UnitPrice: 52000 },
  5: { DrinkName: 'Trà sữa Oolong Nhài', SizeName: 'L', UnitPrice: 62000 },
  6: { DrinkName: 'Cà phê Cốt dừa Phêla', SizeName: 'S', UnitPrice: 48000 },
  7: { DrinkName: 'Cà phê Cốt dừa Phêla', SizeName: 'M', UnitPrice: 58000 },
  8: { DrinkName: 'Trà Ô Long trân châu', SizeName: 'M', UnitPrice: 55000 },
  9: { DrinkName: 'Trà Ô Long trân châu', SizeName: 'L', UnitPrice: 65000 },
  10: { DrinkName: 'Trà Ô Long Nhiệt Đới', SizeName: 'M', UnitPrice: 58000 },
  11: { DrinkName: 'Trà Ô Long Nhiệt Đới', SizeName: 'L', UnitPrice: 68000 },
  12: { DrinkName: 'Cà Phê Trứng Phêla', SizeName: 'S', UnitPrice: 55000 },
  13: { DrinkName: 'Cà Phê Trứng Phêla', SizeName: 'M', UnitPrice: 65000 },
  14: { DrinkName: 'Trà Sữa Matcha Ô Long', SizeName: 'M', UnitPrice: 55000 },
  15: { DrinkName: 'Trà Sữa Matcha Ô Long', SizeName: 'L', UnitPrice: 65000 },
  16: { DrinkName: 'Cà Phê Espresso Sữa Đặc', SizeName: 'S', UnitPrice: 39000 },
  17: { DrinkName: 'Cà Phê Espresso Sữa Đặc', SizeName: 'M', UnitPrice: 49000 },
};

// Server-side mock order memory store for offline mode/sync across ports
export const serverMockOrders: any[] = [];

// Public customer storefront order endpoints (NO verifyJWT check required)
router.post('/customer-place', async (req, res, next) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);
    
    // We try to save to database using Prisma first
    try {
      // Find default admin or first employee to assign to customer online orders
      let employeeId = 1;
      let defaultEmp = await prisma.employee.findFirst({
        where: { RoleID: 1 },
      });
      
      if (!defaultEmp) {
        defaultEmp = await prisma.employee.findFirst();
      }
      
      if (defaultEmp) {
        employeeId = defaultEmp.EmployeeID;
      } else {
        // Create a default role and employee to satisfy FK constraint
        let role = await prisma.employeeRole.findFirst();
        if (!role) {
          role = await prisma.employeeRole.create({
            data: { RoleName: 'System Admin', DefaultBaseSalary: 0 }
          });
        }
        defaultEmp = await prisma.employee.create({
          data: {
            FullName: 'Hệ thống Phêla',
            PhoneNumber: '000000000',
            Email: 'system@phela.vn',
            Birth: new Date(),
            Sex: 'Other',
            PINCode: '0000',
            password: 'none',
            RoleID: role.RoleID
          }
        });
        employeeId = defaultEmp.EmployeeID;
      }

      // Check and dynamically create the Customer profile in DB if not exists to satisfy Foreign Key constraint
      let customerId = validatedData.CustomerID || null;
      if (validatedData.CustomerPhoneNumber) {
        let dbCustomer = await prisma.customer.findFirst({
          where: { PhoneNumber: validatedData.CustomerPhoneNumber },
        });

        if (!dbCustomer) {
          const baseLevel = await prisma.memberShipLevel.findFirst({
            orderBy: { RequiredMoney: 'asc' },
          });

          dbCustomer = await prisma.customer.create({
            data: {
              CustomerName: validatedData.CustomerName || 'Hội Viên Phêla',
              PhoneNumber: validatedData.CustomerPhoneNumber,
              TotalMoneySpending: 0,
              LevelID: baseLevel?.LevelID || 1,
            },
          });
        }
        customerId = dbCustomer.CustomerID;
      }

      // Gather all DrinkSize ids
      const drinkSizeIds = validatedData.Items.map((i) => i.DrinkSizeID);
      const catalogItems = await prisma.drinkSize.findMany({
        where: { DrinkSizeID: { in: drinkSizeIds } },
        include: { Drink: true, Size: true },
      });

      if (catalogItems.length !== drinkSizeIds.length) {
        throw new AppError(
          400,
          'Một hoặc nhiều món không tồn tại trong danh mục.',
        );
      }

      // Validate availability
      for (const item of catalogItems) {
        if (item.DrinkSizeStatus === 'UNAVAILABLE') {
          throw new AppError(
            400,
            `Sản phẩm ${item.Drink.DrinkName} (${item.Size.SizeName}) hiện tại không khả dụng.`,
          );
        }
      }

      // Compute base total pricing
      let baseTotal = 0;
      validatedData.Items.forEach((item) => {
        baseTotal += item.UnitPrice * item.Quantity;
      });

      // Calculate Customer Discount
      let discountRate = 0;
      if (customerId) {
        const customer = await prisma.customer.findUnique({
          where: { CustomerID: customerId },
          include: { MemberShipLevel: true },
        });
        if (customer) {
          discountRate = customer.MemberShipLevel.DiscountRate.toNumber();
        }
      }

      const discountAmount = baseTotal * (discountRate / 100);
      let finalPrice = baseTotal - discountAmount;
      let computedDistance = null;
      let shippingFee = 0;

      if (validatedData.OrderType === 'DELIVERY' && validatedData.Latitude && validatedData.Longitude) {
         // Default shop location (Ho Chi Minh City center)
         const shopLat = 10.762622;
         const shopLng = 106.660172;
         computedDistance = calculateDistance(shopLat, shopLng, validatedData.Latitude, validatedData.Longitude);
         
         if (finalPrice >= 300000) {
            shippingFee = 0; // Free ship > 300k
         } else if (computedDistance <= 3) {
            shippingFee = 15000;
         } else {
            shippingFee = 15000 + Math.ceil(computedDistance - 3) * 5000;
         }
         finalPrice += shippingFee;
      }

      // Validate ShopTableID
      let validShopTableId = validatedData.ShopTableID || null;
      if (validShopTableId) {
        const tableExists = await prisma.shopTable.findUnique({
          where: { ShopTableID: validShopTableId }
        });
        if (!tableExists) {
          validShopTableId = null; // Fallback to null if table doesn't exist
        }
      }

      // Create Order & Details in a Transaction
      const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.orders.create({
          data: {
            CustomerID: customerId,
            ShopTableID: validShopTableId,
            EmployeeID: employeeId,
            OrderStatus: 'PENDING',
            TotalPrice: finalPrice,
            OrderNote: validatedData.OrderNote || null,
            OrderType: validatedData.OrderType || (validShopTableId ? 'DINE_IN' : 'TAKEAWAY'),
            ShippingAddress: validatedData.ShippingAddress || null,
            Latitude: validatedData.Latitude || null,
            Longitude: validatedData.Longitude || null,
            Distance: computedDistance,
            ReceiverName: validatedData.ReceiverName || validatedData.CustomerName || null,
            ReceiverPhone: validatedData.ReceiverPhone || validatedData.CustomerPhoneNumber || null,
            ShippingFee: shippingFee,
          },
        });

        await tx.orderDetail.createMany({
          data: validatedData.Items.map((item) => {
            return {
              OrderID: order.OrderID,
              DrinkSizeID: item.DrinkSizeID,
              Quantity: item.Quantity,
              Sugar: item.Sugar || '100%',
              Ice: item.Ice || '100%',
              Toppings: item.Toppings || null,
              UnitPrice: item.UnitPrice,
            };
          }),
        });

        return tx.orders.findUnique({
          where: { OrderID: order.OrderID },
          include: {
            Customer: { select: { CustomerName: true, PhoneNumber: true } },
            ShopTable: { select: { ShopTableNumber: true } },
            Employee: { select: { FullName: true } },
            OrderDetails: {
              include: {
                DrinkSize: {
                  include: {
                    Drink: { select: { DrinkName: true } },
                    Size: { select: { SizeName: true } },
                  },
                },
              },
            },
          },
        });
      });

      // Mark the active cart as completed
      if (customerId) {
        await prisma.cart.updateMany({
          where: { CustomerID: customerId, Status: 'ACTIVE' },
          data: { Status: 'COMPLETED' }
        });
      }

      return sendResponse(res, 201, true, 'Đơn hàng đã được tạo thành công.', newOrder);
    } catch (dbErr: any) {
      console.warn('Prisma DB error, falling back to server-side in-memory mock store:', dbErr.message);
      
      // Fallback: Save to serverMockOrders in memory
      const newOId = serverMockOrders.length + 1000 + 1; // start mock IDs from 1001
      const newO = {
        OrderID: newOId,
        CustomerID: validatedData.CustomerID || 1,
        Customer: {
          CustomerName: validatedData.CustomerName || 'Hội viên Phêla',
          PhoneNumber: validatedData.CustomerPhoneNumber || '0900000000',
        },
        ShopTableID: validatedData.ShopTableID || null,
        EmployeeID: 1,
        CreatedTime: new Date().toISOString(),
        OrderStatus: 'PENDING',
        TotalPrice: req.body.TotalPrice || 55000,
        OrderType: validatedData.OrderType || (validatedData.ShopTableID ? 'DINE_IN' : 'TAKEAWAY'),
        ShippingAddress: validatedData.ShippingAddress || null,
        Latitude: validatedData.Latitude || null,
        Longitude: validatedData.Longitude || null,
        ReceiverName: validatedData.ReceiverName || validatedData.CustomerName || null,
        ReceiverPhone: validatedData.ReceiverPhone || validatedData.CustomerPhoneNumber || null,
        OrderNote: validatedData.OrderNote || null,
        OrderDetails: validatedData.Items.map((item) => {
          const matched = mockDrinkSizesMap[item.DrinkSizeID] || { DrinkName: 'Trà Phêla', SizeName: 'M', UnitPrice: 50000 };
          return {
            OrderID: newOId,
            DrinkSizeID: item.DrinkSizeID,
            Quantity: item.Quantity,
            UnitPrice: matched.UnitPrice,
            DrinkSize: {
              Drink: { DrinkName: matched.DrinkName },
              Size: { SizeName: matched.SizeName },
            },
          };
        }),
      };

      serverMockOrders.push(newO);
      return sendResponse(res, 201, true, 'Đơn hàng đã được tạo thành công trên bộ nhớ tạm server (Offline Mode).', newO);
    }
  } catch (err) {
    next(err);
  }
});

router.get('/customer-history/:phoneNumber', async (req, res, next) => {
  try {
    const phoneNumber = req.params.phoneNumber;
    if (!phoneNumber) throw new AppError(400, 'Số điện thoại không hợp lệ.');

    try {
      const dbOrders = await prisma.orders.findMany({
        where: {
          Customer: { PhoneNumber: phoneNumber },
        },
        orderBy: { OrderID: 'desc' },
        include: {
          Customer: { select: { CustomerName: true, PhoneNumber: true } },
          ShopTable: { select: { ShopTableNumber: true } },
          Employee: { select: { FullName: true } },
          Reviews: { select: { DrinkID: true, Rating: true } },
          OrderDetails: {
            include: {
              DrinkSize: {
                include: {
                  Drink: { select: { DrinkName: true } },
                  Size: { select: { SizeName: true } },
                },
              },
            },
          },
        },
      });
      return sendResponse(res, 200, true, 'Lịch sử đặt hàng hội viên', dbOrders);
    } catch {
      // Offline fallback: filter from serverMockOrders by phone number
      const clientOrders = serverMockOrders
        .filter((o) => o.Customer?.PhoneNumber === phoneNumber)
        .sort((a, b) => b.OrderID - a.OrderID);
      return sendResponse(res, 200, true, 'Lịch sử đặt hàng hội viên (Offline Mode)', clientOrders);
    }
  } catch (err) {
    next(err);
  }
});

// GET /customer-status/:id - Public status polling for customer UI
router.get('/customer-status/:id', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    try {
      const order = await prisma.orders.findUnique({ where: { OrderID: orderId } });
      if (!order) throw new AppError(404, 'Order not found.');

      if (order.OrderStatus === 'PENDING') {
        try {
          const payosRes = await payos.paymentRequests.get(order.OrderID);
          if (payosRes.status === 'PAID') {
            order.PaymentStatus = 'PAID';
            order.PaymentMethod = 'QR_CODE';
            await prisma.orders.update({
              where: { OrderID: order.OrderID },
              data: { PaymentStatus: 'PAID', PaymentMethod: 'QR_CODE' }
            });
            console.log(`[PayOS Polling] Auto-updated order ${order.OrderID} to PAID`);
          }
        } catch {}
      }
      return sendResponse(res, 200, true, 'Status', order);
    } catch {
      const order = serverMockOrders.find(o => o.OrderID === orderId);
      if (!order) throw new AppError(404, 'Order not found offline');
      return sendResponse(res, 200, true, 'Status Offline', order);
    }
  } catch(err) {
    next(err);
  }
});

// Protect routes for staff admin dashboard operations
router.use(verifyJWT);

// GET / - List all orders with filters (by table, status, date, pagination)
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, sortBy, sortDir, skip } = parsePagination(req.query);
    const shopTableId = req.query.shopTableId
      ? parseInt(req.query.shopTableId as string)
      : undefined;
    const status = req.query.status as string;
    const dateQuery = req.query.date as string; // 'YYYY-MM-DD'

    const where: any = {};

    if (shopTableId) {
      where.ShopTableID = shopTableId;
    }

    if (status) {
      where.OrderStatus = status;
    }

    if (dateQuery) {
      const startDate = new Date(`${dateQuery}T00:00:00.000Z`);
      const endDate = new Date(`${dateQuery}T23:59:59.999Z`);
      where.CreatedTime = {
        gte: startDate,
        lte: endDate,
      };
    }

    try {
      const [totalItems, orders] = await prisma.$transaction([
        prisma.orders.count({ where }),
        prisma.orders.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortDir },
          include: {
            Customer: { select: { CustomerName: true, PhoneNumber: true } },
            ShopTable: { select: { ShopTableNumber: true } },
            Employee: { select: { FullName: true } },
            OrderDetails: {
              include: {
                DrinkSize: {
                  include: {
                    Drink: { select: { DrinkName: true } },
                    Size: { select: { SizeName: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return sendResponse(res, 200, true, 'Orders list retrieved successfully', orders, {
        page,
        limit,
        totalItems,
        totalPages,
      });
    } catch {
      // Offline fallback: filter from serverMockOrders
      let filtered = [...serverMockOrders];
      if (shopTableId) {
        filtered = filtered.filter((o) => o.ShopTableID === shopTableId);
      }
      if (status) {
        filtered = filtered.filter((o) => o.OrderStatus === status);
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / limit);
      const ordersSlice = filtered.slice(skip, skip + limit);

      return sendResponse(res, 200, true, 'Orders list (Offline Mode)', ordersSlice, {
        page,
        limit,
        totalItems,
        totalPages,
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single order details
router.get('/:id', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    try {
      const order = await prisma.orders.findUnique({
        where: { OrderID: orderId },
        include: {
          Customer: true,
          ShopTable: true,
          Employee: true,
          OrderDetails: {
            include: {
              DrinkSize: {
                include: {
                  Drink: true,
                  Size: true,
                },
              },
            },
          },
        },
      });

      if (!order) throw new AppError(404, 'Order not found.');

      // Automatically check PayOS status if the order is PENDING
      if (order.OrderStatus === 'PENDING') {
        try {
          const payosRes = await payos.paymentRequests.get(order.OrderID);
          if (payosRes.status === 'PAID') {
            order.PaymentStatus = 'PAID';
            order.PaymentMethod = 'QR_CODE'; // Assume it was paid via QR
            await prisma.orders.update({
              where: { OrderID: order.OrderID },
              data: { PaymentStatus: 'PAID', PaymentMethod: 'QR_CODE' },
            });
            console.log(`[PayOS Polling] Auto-updated order ${order.OrderID} to PAID`);
          }
        } catch (payosErr: any) {
          // Ignore errors if the payment link doesn't exist on PayOS yet or expired
        }
      }

      return sendResponse(res, 200, true, 'Order retrieved', order);
    } catch {
      const order = serverMockOrders.find((o) => o.OrderID === orderId);
      if (!order) throw new AppError(404, 'Order not found in server memory.');
      return sendResponse(res, 200, true, 'Order retrieved (Offline Mode)', order);
    }
  } catch (err) {
    next(err);
  }
});

// POST / - Create a new order (Staff/Manager/Admin)
router.post('/', async (req, res, next) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);
    const employeeId = req.user?.EmployeeID;

    if (!employeeId) {
      throw new AppError(401, 'Unauthorized: Handlers missing user token.');
    }

    // 1. Gather all DrinkSize ids
    const drinkSizeIds = validatedData.Items.map((i) => i.DrinkSizeID);
    
    // We try to save to database using Prisma first
    try {
      const catalogItems = await prisma.drinkSize.findMany({
        where: { DrinkSizeID: { in: drinkSizeIds } },
        include: { Drink: true, Size: true },
      });

      if (catalogItems.length !== drinkSizeIds.length) {
        throw new AppError(
          400,
          'One or more items in your order do not exist in the product catalog.',
        );
      }

      // 2. Validate availability
      for (const item of catalogItems) {
        if (item.DrinkSizeStatus === 'UNAVAILABLE') {
          throw new AppError(
            400,
            `The product ${item.Drink.DrinkName} (${item.Size.SizeName}) is currently unavailable.`,
          );
        }
      }

      // 3. Compute base total pricing
      let baseTotal = 0;
      validatedData.Items.forEach((item) => {
        baseTotal += item.UnitPrice * item.Quantity;
      });

      // 4. Calculate Customer Discount
      let discountRate = 0;
      if (validatedData.CustomerID) {
        const customer = await prisma.customer.findUnique({
          where: { CustomerID: validatedData.CustomerID },
          include: { MemberShipLevel: true },
        });
        if (!customer) {
          throw new AppError(404, 'The associated customer record was not found.');
        }
        discountRate = customer.MemberShipLevel.DiscountRate.toNumber();
      }

      const discountAmount = baseTotal * (discountRate / 100);
      const finalPrice = baseTotal - discountAmount;

      // Validate ShopTableID
      let validShopTableId = validatedData.ShopTableID || null;
      if (validShopTableId) {
        const tableExists = await prisma.shopTable.findUnique({
          where: { ShopTableID: validShopTableId }
        });
        if (!tableExists) {
          validShopTableId = null; // Fallback to null if table doesn't exist
        }
      }

      // 5. Create Order & Details in a Transaction
      const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.orders.create({
          data: {
            CustomerID: validatedData.CustomerID || null,
            ShopTableID: validShopTableId,
            EmployeeID: employeeId,
            OrderStatus: 'PENDING',
            TotalPrice: finalPrice,
            OrderNote: validatedData.OrderNote || null,
          },
        });

        await tx.orderDetail.createMany({
          data: validatedData.Items.map((item) => {
            return {
              OrderID: order.OrderID,
              DrinkSizeID: item.DrinkSizeID,
              Quantity: item.Quantity,
              Sugar: item.Sugar || '100%',
              Ice: item.Ice || '100%',
              Toppings: item.Toppings || null,
              UnitPrice: item.UnitPrice,
            };
          }),
        });

        return tx.orders.findUnique({
          where: { OrderID: order.OrderID },
          include: { OrderDetails: true },
        });
      });

      return sendResponse(res, 201, true, 'Order created successfully', newOrder);
    } catch (dbErr: any) {
      if (dbErr.statusCode === 400 || dbErr.statusCode === 404) {
        throw dbErr;
      }
      console.warn('Prisma DB error, falling back to server-side in-memory mock store:', dbErr.message);

      // Fallback: Save to serverMockOrders in memory
      const newOId = serverMockOrders.length + 1000 + 1;
      const newO = {
        OrderID: newOId,
        CustomerID: validatedData.CustomerID || null,
        ShopTableID: validatedData.ShopTableID || null,
        EmployeeID: employeeId,
        CreatedTime: new Date().toISOString(),
        OrderStatus: 'PENDING',
        TotalPrice: validatedData.Items.reduce((acc, item) => {
          const matched = mockDrinkSizesMap[item.DrinkSizeID] || { UnitPrice: 50000 };
          return acc + matched.UnitPrice * item.Quantity;
        }, 0),
        OrderNote: validatedData.OrderNote || null,
        OrderDetails: validatedData.Items.map((item) => {
          const matched = mockDrinkSizesMap[item.DrinkSizeID] || { DrinkName: 'Trà Phêla', SizeName: 'M', UnitPrice: 50000 };
          return {
            OrderID: newOId,
            DrinkSizeID: item.DrinkSizeID,
            Quantity: item.Quantity,
            UnitPrice: matched.UnitPrice,
            DrinkSize: {
              Drink: { DrinkName: matched.DrinkName },
              Size: { SizeName: matched.SizeName },
            },
          };
        }),
      };

      serverMockOrders.push(newO);
      return sendResponse(res, 201, true, 'Order created successfully in server memory (Offline Mode)', newO);
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/status - Update Order Status & Trigger customer total updates on COMPLETED (Staff/Manager/Admin)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = updateStatusSchema.parse(req.body);

    try {
      const order = await prisma.orders.findUnique({
        where: { OrderID: orderId },
      });

      if (!order) throw new AppError(404, 'Order not found.');

      // Guard status transition duplicates
      if (order.OrderStatus === 'COMPLETED') {
        throw new AppError(400, 'Cannot change the status of an already completed order.');
      }
      if (order.OrderStatus === 'CANCELLED') {
        throw new AppError(400, 'Cannot change the status of an already cancelled order.');
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        // 1. Update order status
        const updated = await tx.orders.update({
          where: { OrderID: orderId },
          data: { OrderStatus: validatedData.OrderStatus },
        });

        // 2. If status moves to COMPLETED and customer is present, add to Customer spending
        if (validatedData.OrderStatus === 'COMPLETED' && order.CustomerID) {
          await tx.customer.update({
            where: { CustomerID: order.CustomerID },
            data: {
              TotalMoneySpending: {
                increment: order.TotalPrice,
              },
            },
          });

          // 3. Evaluate & upgrade membership levels
          await upgradeCustomerLevel(order.CustomerID, tx);
        }

        // 4. Tự động khấu trừ nguyên liệu pha chế trong kho khi hoàn thành đơn
        if (validatedData.OrderStatus === 'COMPLETED') {
          const orderDetails = await tx.orderDetail.findMany({
            where: { OrderID: orderId },
            include: {
              DrinkSize: {
                select: { DrinkID: true },
              },
            },
          });

          for (const item of orderDetails) {
            const drinkId = item.DrinkSize.DrinkID;
            const quantityOrdered = item.Quantity;

            // Lấy các công thức pha chế liên kết với đồ uống này
            const recipes = await tx.recipe.findMany({
              where: { DrinkID: drinkId },
              include: {
                RecipeDetails: true,
              },
            });

            for (const recipe of recipes) {
              for (const detail of recipe.RecipeDetails) {
                const quantityToDeduct = detail.Quantity.toNumber() * quantityOrdered;

                // Giảm trừ tồn kho nguyên liệu tương ứng
                await tx.ingredient.update({
                  where: { IngredientID: detail.IngredientID },
                  data: {
                    QuantityStock: {
                      decrement: quantityToDeduct,
                    },
                  },
                });
              }
            }
          }
        }

        return updated;
      });

      return sendResponse(
        res,
        200,
        true,
        `Order status updated to ${validatedData.OrderStatus}`,
        updatedOrder,
      );
    } catch (dbErr: any) {
      if (dbErr.statusCode === 400 || dbErr.statusCode === 404) {
        throw dbErr;
      }
      console.warn('Prisma DB error, falling back to server-side in-memory mock store:', dbErr.message);

      // Fallback: Update in serverMockOrders
      const idx = serverMockOrders.findIndex((o) => o.OrderID === orderId);
      if (idx === -1) throw new AppError(404, 'Order not found in server memory.');

      if (serverMockOrders[idx].OrderStatus === 'COMPLETED') {
        throw new AppError(400, 'Cannot change the status of an already completed order.');
      }
      if (serverMockOrders[idx].OrderStatus === 'CANCELLED') {
        throw new AppError(400, 'Cannot change the status of an already cancelled order.');
      }

      serverMockOrders[idx].OrderStatus = validatedData.OrderStatus;
      return sendResponse(
        res,
        200,
        true,
        `Order status updated to ${validatedData.OrderStatus} in server memory (Offline Mode)`,
        serverMockOrders[idx],
      );
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/assign-shipper - Assign a shipper to a delivery order
router.patch('/:id/assign-shipper', verifyJWT, requireRole([1, 2]), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = assignShipperSchema.parse(req.body);

    const order = await prisma.orders.findUnique({
      where: { OrderID: orderId },
    });

    if (!order) throw new AppError(404, 'Order not found.');

    if (order.OrderType !== 'DELIVERY') {
      throw new AppError(400, 'Chỉ có thể gán tài xế cho đơn Giao hàng (DELIVERY).');
    }

    if (order.OrderStatus !== 'PENDING' && order.OrderStatus !== 'PREPARING') {
      throw new AppError(400, 'Chỉ có thể gán tài xế khi đơn đang ở trạng thái Chờ xác nhận hoặc Đang pha chế.');
    }

    const updatedOrder = await prisma.orders.update({
      where: { OrderID: orderId },
      data: {
        OrderStatus: 'SHIPPING',
        DeliveryMethod: validatedData.DeliveryMethod,
        ShipperID: validatedData.DeliveryMethod === 'INTERNAL' ? validatedData.ShipperID : null,
        ThirdPartyShipperName: validatedData.DeliveryMethod === 'THIRD_PARTY' ? validatedData.ThirdPartyShipperName : null,
        ThirdPartyShipperPhone: validatedData.DeliveryMethod === 'THIRD_PARTY' ? validatedData.ThirdPartyShipperPhone : null,
        TrackingURL: validatedData.DeliveryMethod === 'THIRD_PARTY' ? validatedData.TrackingURL : null,
      },
    });

    return sendResponse(
      res,
      200,
      true,
      'Đã gán tài xế và chuyển trạng thái đơn hàng sang Đang giao (SHIPPING).',
      updatedOrder,
    );
  } catch (err) {
    next(err);
  }
});

export default router;
