import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole, optionalAuth } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { upgradeCustomerLevel } from '../customers/customers.router';
import { payos } from '../payment/payment.controller';
import { GhnService } from '../shipping/ghn.service';

export async function processOrderIngredients(tx: any, items: { DrinkSizeID: number, Quantity: number }[], mode: 'deduct' | 'refund') {
  for (const item of items) {
    const ds = await tx.drinkSize.findUnique({
      where: { DrinkSizeID: item.DrinkSizeID },
      include: { Size: true }
    });
    if (!ds) continue;
    
    const multiplier = ds.Size.VolumeML / 500.0;
    const recipe = await tx.recipe.findFirst({
      where: { DrinkID: ds.DrinkID },
      orderBy: { createdAt: 'desc' },
      include: { RecipeDetails: true },
    });

    if (recipe) {
      for (const detail of recipe.RecipeDetails) {
        const baseQuantity = detail.Quantity.toNumber();
        const quantityToAdjust = baseQuantity * multiplier * item.Quantity;

        const ingredient = await tx.ingredient.findUnique({
          where: { IngredientID: detail.IngredientID }
        });
        
        if (ingredient) {
          if (mode === 'deduct') {
            const result = await tx.ingredient.updateMany({
              where: {
                IngredientID: detail.IngredientID,
                QuantityStock: { gte: quantityToAdjust }
              },
              data: {
                QuantityStock: { decrement: quantityToAdjust },
              },
            });
            if (result.count === 0) {
              throw new AppError(400, `Nguyên liệu ${ingredient.IngredientName} không đủ tồn kho (Cần thêm: ${quantityToAdjust}). Lỗi đồng bộ dữ liệu (Race Condition)!`);
            }
          } else {
            await tx.ingredient.update({
              where: { IngredientID: detail.IngredientID },
              data: {
                QuantityStock: { increment: quantityToAdjust },
              },
            });
          }
        }
      }
    }
  }
}

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
  ProvinceID: z.number().int().optional().nullable(),
  DistrictID: z.number().int().optional().nullable(),
  WardCode: z.string().optional().nullable(),
  ReceiverName: z.string().optional().nullable(),
  ReceiverPhone: z.string().optional().nullable(),
  VoucherCode: z.string().optional().nullable(),
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


// Public customer storefront order endpoints (NO verifyJWT check required)
router.post('/customer-combos', async (req, res, next) => {
  try {
    const { drinkSizeIds } = req.body;
    if (!drinkSizeIds || !Array.isArray(drinkSizeIds) || drinkSizeIds.length === 0) {
      return sendResponse(res, 200, true, 'No combos', []);
    }

    // Lấy danh sách High Utility Itemsets đã được cache
    const huiCache = await prisma.highUtilityItemset.findMany({
        orderBy: { Rank: 'asc' },
        take: 100
    });

    const recommendedItemIds = new Set<number>();
    
    // Tìm các tập HUI có chứa tất cả các món khách hàng đang chọn
    for (const hui of huiCache) {
        try {
            const itemset: number[] = JSON.parse(hui.Itemset);
            const containsAll = drinkSizeIds.every(id => itemset.includes(id));
            if (containsAll) {
                // Thêm các món MỚI (chưa có trong giỏ) từ tập HUI này vào danh sách gợi ý
                for (const id of itemset) {
                    if (!drinkSizeIds.includes(id)) {
                        recommendedItemIds.add(id);
                    }
                }
            }
        } catch (e) {}

        if (recommendedItemIds.size >= 3) break; // Giới hạn gợi ý tối đa 3 món
    }

    if (recommendedItemIds.size === 0) {
        return sendResponse(res, 200, true, 'No combos', []);
    }

    const recommendedArray = Array.from(recommendedItemIds).slice(0, 3);
    const drinks = await prisma.drinkSize.findMany({
        where: { DrinkSizeID: { in: recommendedArray } },
        include: { Drink: true, Size: true }
    });

    const result = recommendedArray.map(id => {
        const d = drinks.find(drink => drink.DrinkSizeID === id);
        if (!d) return null;
        return {
            DrinkSizeID: d.DrinkSizeID,
            DrinkName: d.Drink.DrinkName,
            SizeName: d.Size.SizeName,
            UnitPrice: d.UnitPrice,
            DrinkImageURL: d.Drink.DrinkImageURL,
        };
    }).filter(d => d !== null);

    return sendResponse(res, 200, true, 'Combo suggestions based on High Utility Itemsets', result);
  } catch (err) {
    next(err);
  }
});

router.get('/customer-frequent/:customerId', async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.customerId || '0');
    if (isNaN(customerId) || customerId <= 0) {
      return sendResponse(res, 200, true, 'No frequent items', []);
    }

    try {
      // Lấy tất cả OrderDetails của khách hàng này từ các đơn hoàn thành
      const details = await prisma.orderDetail.findMany({
        where: {
          Orders: {
            CustomerID: customerId,
            OrderStatus: { in: ['COMPLETED', 'PENDING', 'PREPARING', 'READY'] },
          },
        },
        include: {
          DrinkSize: {
            include: { Drink: true, Size: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200, // Look at recent 200 items to avoid perf issue
      });

      if (details.length === 0) {
        return sendResponse(res, 200, true, 'No frequent items', []);
      }

      // Gom nhóm theo DrinkSizeID
      const frequencyMap = new Map<number, { count: number, item: any, configs: any[] }>();
      
      for (const d of details) {
        if (!frequencyMap.has(d.DrinkSizeID)) {
          frequencyMap.set(d.DrinkSizeID, { count: 0, item: d, configs: [] });
        }
        const entry = frequencyMap.get(d.DrinkSizeID)!;
        entry.count += 1;
        entry.configs.push({ Sugar: d.Sugar, Ice: d.Ice, Toppings: d.Toppings || '' });
      }

      // Sort by count
      const sorted = Array.from(frequencyMap.values()).sort((a, b) => b.count - a.count).slice(0, 5); // Lấy Top 5

      // Build final response with most common config for each
      const result = sorted.map(s => {
        // Find most common config
        const configCount = new Map<string, number>();
        for (const cfg of s.configs) {
          const key = `${cfg.Sugar}|${cfg.Ice}|${cfg.Toppings}`;
          configCount.set(key, (configCount.get(key) || 0) + 1);
        }
        
        let bestConfigStr = '';
        let maxCfg = 0;
        for (const [key, count] of configCount.entries()) {
          if (count > maxCfg) {
            maxCfg = count;
            bestConfigStr = key;
          }
        }
        const [sugar, ice, toppings] = bestConfigStr.split('|');

        return {
          DrinkSizeID: s.item.DrinkSizeID,
          DrinkName: s.item.DrinkSize.Drink.DrinkName,
          SizeName: s.item.DrinkSize.Size.SizeName,
          UnitPrice: s.item.DrinkSize.UnitPrice,
          DrinkImageURL: s.item.DrinkSize.Drink.DrinkImageURL,
          FrequencyCount: s.count,
          PreferredConfig: {
            Sugar: sugar,
            Ice: ice,
            Toppings: toppings
          }
        };
      });

      return sendResponse(res, 200, true, 'Lấy danh sách món tủ thành công', result);
    } catch (err) {
      next(err);
    }
  } catch (err) {
    next(err);
  }
});

router.post('/customer-place', optionalAuth, async (req, res, next) => {
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

      // Compute base total pricing securely
      let baseTotal = 0;
      validatedData.Items.forEach((item) => {
        const catalogItem = catalogItems.find(c => c.DrinkSizeID === item.DrinkSizeID);
        if (catalogItem) {
           item.UnitPrice = catalogItem.UnitPrice.toNumber();
        }
        baseTotal += item.UnitPrice * item.Quantity;
      });

      // Calculate Promotion Discount (Best applicable promo)
      let promotionDiscountAmount = 0;
      const now = new Date();
      const activePromos = await prisma.promotion.findMany({
        where: { 
          IsActive: true,
          OR: [
            { StartDate: null, EndDate: null },
            { StartDate: { lte: now }, EndDate: { gte: now } },
            { StartDate: { lte: now }, EndDate: null },
            { StartDate: null, EndDate: { gte: now } }
          ]
        }
      });

      for (const promo of activePromos) {
        let applicableItemsTotal = 0;
        let applicableQuantity = 0;
        
        let targetIds: number[] | null = null;
        if (promo.TargetDrinkIDs) {
          try {
            targetIds = JSON.parse(promo.TargetDrinkIDs);
          } catch {}
        }
        
        for (const item of validatedData.Items) {
          if (!targetIds || targetIds.includes(item.DrinkSizeID)) {
            applicableItemsTotal += item.UnitPrice * item.Quantity;
            applicableQuantity += item.Quantity;
          }
        }

        if (applicableQuantity >= promo.MinQuantity) {
          let currentPromoDiscount = 0;
          if (promo.Type === 'PERCENT') {
            currentPromoDiscount = applicableItemsTotal * (Number(promo.Value) / 100);
          } else if (promo.Type === 'AMOUNT') {
            currentPromoDiscount = Number(promo.Value);
          } else if (promo.Type === 'FREE_ITEM') {
            const applicableSorted = validatedData.Items
              .filter(i => !targetIds || targetIds.includes(i.DrinkSizeID))
              .sort((a, b) => a.UnitPrice - b.UnitPrice);
            const multiplier = Math.floor(applicableQuantity / promo.MinQuantity);
            let freeItemsToGive = Number(promo.Value) * multiplier;
            for (const item of applicableSorted) {
              if (freeItemsToGive <= 0) break;
              const qtyToFree = Math.min(item.Quantity, freeItemsToGive);
              currentPromoDiscount += qtyToFree * item.UnitPrice;
              freeItemsToGive -= qtyToFree;
            }
          }
          
          if (currentPromoDiscount > promotionDiscountAmount) {
            promotionDiscountAmount = currentPromoDiscount;
          }
        }
      }

      // Ratio of remaining price after promo to original price
      const promoRatio = baseTotal > 0 ? (baseTotal - promotionDiscountAmount) / baseTotal : 1;

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

      // Check Voucher
      let voucherDiscountAmount = 0;
      let membershipDiscount = 0;
      let usedVoucherId = null;

      if (validatedData.VoucherCode) {
        // @ts-ignore - Prisma types might be out of sync if server is not restarted yet
        const voucher = await prisma.voucher.findUnique({ where: { Code: validatedData.VoucherCode } });
        if (!voucher) throw new AppError(404, 'Mã giảm giá không tồn tại');
        if (voucher.IsUsed) throw new AppError(400, 'Mã giảm giá đã được sử dụng');
        if (voucher.ValidUntil && new Date(voucher.ValidUntil) < new Date()) throw new AppError(400, 'Mã giảm giá đã hết hạn');
        if (voucher.OwnerID && voucher.OwnerID !== customerId) throw new AppError(403, 'Mã giảm giá không dành cho tài khoản này');

        // Apply voucher
        let targetItemTotal = 0;
        let otherItemsTotal = 0;

        if (voucher.TargetProductID) {
          // Find exactly 1 item in the cart to apply
          let applied = false;
          for (const item of validatedData.Items) {
            if (item.DrinkSizeID === voucher.TargetProductID && !applied) {
               // apply to 1 cup
               targetItemTotal += item.UnitPrice;
               otherItemsTotal += item.UnitPrice * (item.Quantity - 1);
               applied = true;
            } else {
               otherItemsTotal += item.UnitPrice * item.Quantity;
            }
          }
          if (!applied) throw new AppError(400, 'Giỏ hàng không chứa món được áp dụng mã giảm giá');
        } else {
           targetItemTotal = baseTotal;
           otherItemsTotal = 0;
        }

        // Scale down totals to calculate voucher on the remaining amount after promotion
        targetItemTotal = targetItemTotal * promoRatio;
        otherItemsTotal = otherItemsTotal * promoRatio;

        // Calculate voucher discount on targetItemTotal
        if (voucher.DiscountType === 'PERCENT') {
           voucherDiscountAmount = targetItemTotal * (Number(voucher.DiscountValue) / 100);
        } else {
           voucherDiscountAmount = Number(voucher.DiscountValue);
           if (voucherDiscountAmount > targetItemTotal) voucherDiscountAmount = targetItemTotal;
        }

        // The remaining items still get membership discount
        membershipDiscount = otherItemsTotal * (discountRate / 100);
        usedVoucherId = voucher.VoucherID;
        
      } else {
        // Normal membership discount on whole bill (after promotion)
        membershipDiscount = (baseTotal * promoRatio) * (discountRate / 100);
      }

      const totalDiscount = promotionDiscountAmount + voucherDiscountAmount + membershipDiscount;
      let finalPrice = Math.max(0, baseTotal - totalDiscount);
      let computedDistance = null;
      let shippingFee = 0;

      if (validatedData.OrderType === 'DELIVERY' && validatedData.DistrictID && validatedData.WardCode) {
         if (finalPrice >= 300000) {
            shippingFee = 0; // Free ship > 300k
         } else {
            try {
               const ghnFeeRes = await GhnService.calculateFee({
                  to_district_id: validatedData.DistrictID,
                  to_ward_code: validatedData.WardCode,
                  weight: validatedData.Items.reduce((acc, curr) => acc + (curr.Quantity * 500), 0),
                  insurance_value: finalPrice
               });
               shippingFee = ghnFeeRes;
            } catch (e) {
               console.error('GHN Calculate Fee Error:', e);
               shippingFee = 0;
            }
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
        if (usedVoucherId) {
          const v = await tx.voucher.findUnique({ where: { VoucherID: usedVoucherId } });
          if (!v || v.IsUsed) throw new AppError(400, 'Mã giảm giá không hợp lệ hoặc đã được sử dụng');
          await tx.voucher.update({
            where: { VoucherID: usedVoucherId },
            data: { IsUsed: true }
          });
        }
        const order = await tx.orders.create({
          data: {
            VoucherID: usedVoucherId,
            CustomerID: customerId,
            ShopTableID: validShopTableId,
            EmployeeID: employeeId,
            OrderStatus: 'PENDING',
            TotalPrice: finalPrice,
            OrderNote: validatedData.OrderNote || null,
            OrderType: validatedData.OrderType || (validShopTableId ? 'DINE_IN' : 'TAKEAWAY'),
            ShippingAddress: validatedData.ShippingAddress || null,
            ProvinceID: validatedData.ProvinceID || null,
            DistrictID: validatedData.DistrictID || null,
            WardCode: validatedData.WardCode || null,
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

        if (usedVoucherId) {
          // @ts-ignore
          await tx.voucher.update({
            where: { VoucherID: usedVoucherId },
            data: { IsUsed: true }
          });
        }

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
      next(dbErr);
    }
  } catch (err) {
    next(err);
  }
});

router.get('/customer-history', verifyJWT, async (req, res, next) => {
  try {
    const customerId = req.user?.CustomerID;
    if (!customerId) throw new AppError(401, 'Unauthorized');

    try {
      const dbOrders = await prisma.orders.findMany({
        where: { CustomerID: customerId },
        orderBy: { OrderID: 'desc' },
        include: {
          Customer: true,
          ShopTable: true,
          OrderDetails: {
            include: {
              DrinkSize: {
                include: { Drink: true, Size: true },
              },
            },
          },
        },
        orderBy: { CreatedTime: 'desc' },
      });
      return sendResponse(res, 200, true, 'Lịch sử đặt hàng hội viên', dbOrders);
    } catch (err) {
      next(err);
    }
  } catch (err) {
    next(err);
  }
});

router.get('/customer-status/:id', optionalAuth, async (req, res, next) => {
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
            
            // Sync to GHN if it's a delivery order
            const ghnCode = await checkAndSyncGHN(order);
            if (ghnCode) order.GHN_OrderCode = ghnCode;
          }
        } catch {}
      }
      return sendResponse(res, 200, true, 'Status', order);
    } catch (err) {
      next(err);
    }
  } catch(err) {
    next(err);
  }
});

// PATCH /customer-cancel/:id - Public cancel endpoint for customers
router.patch('/customer-cancel/:id', verifyJWT, async (req, res, next) => {
    const customerId = req.user?.CustomerID;
    const { RefundBankCode, RefundAccountNumber, RefundAccountName, RefundReason } = req.body;
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    try {
      const order = await prisma.orders.findUnique({
        where: { OrderID: orderId },
        include: { OrderDetails: true }
      });
      if (!order) throw new AppError(404, 'Order not found.');
    if (order.CustomerID && order.CustomerID !== customerId) throw new AppError(403, 'Forbidden');

      if (order.OrderStatus !== 'PENDING') {
        throw new AppError(400, 'Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý.');
      }

      if (order.PaymentStatus === 'PAID') {
        if (!RefundBankCode || !RefundAccountNumber || !RefundAccountName) {
          throw new AppError(400, 'Vui lòng cung cấp thông tin tài khoản ngân hàng để nhận hoàn tiền.');
        }
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updateData: any = { OrderStatus: 'CANCELLED' };
        if (order.PaymentStatus === 'PAID') {
          updateData.RefundStatus = 'PENDING';
          updateData.RefundBankCode = RefundBankCode;
          updateData.RefundAccountNumber = RefundAccountNumber;
          updateData.RefundAccountName = RefundAccountName;
          if (RefundReason) updateData.RefundReason = RefundReason;
        }

        const updated = await tx.orders.update({
            where: { OrderID: orderId },
            data: updateData,
          });

          // Refund voucher if cancelled
          if (order.VoucherID) {
            await tx.voucher.update({
              where: { VoucherID: order.VoucherID },
              data: { IsUsed: false },
            });
          }

        return updated;
      });

      // 5. Sync to GHN if shop accepts the order (PREPARING)
      if (validatedData.OrderStatus === 'PREPARING' && updatedOrder.DeliveryType === 'DELIVERY' && !updatedOrder.GHN_OrderCode) {
        const ghnCode = await checkAndSyncGHN(updatedOrder);
        if (ghnCode) updatedOrder.GHN_OrderCode = ghnCode;
      }

      return sendResponse(
        res,
        200,
        true,
        `Order status updated to CANCELLED`,
        updatedOrder,
      );
    } catch (dbErr: any) {
      next(dbErr);
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/assign-shipper - Assign a shipper to a delivery order
router.patch('/:id/assign-shipper', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
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

// GET / - Admin/Staff get all orders
router.get('/', verifyJWT, requireRole(['ADMIN', 'MANAGER', 'STAFF', 'SHIPPER']), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    const orders = await prisma.orders.findMany({
      take: limit,
      orderBy: { OrderID: sortDir },
      include: {
        Customer: { select: { CustomerName: true, PhoneNumber: true } },
        ShopTable: { select: { ShopTableNumber: true } },
        Employee: { select: { FullName: true } },
        OrderDetails: {
          include: {
            DrinkSize: {
              include: {
                Drink: { select: { DrinkName: true, DrinkImageURL: true } },
                Size: { select: { SizeName: true } },
              },
            },
          },
        },
      },
    });

    return sendResponse(res, 200, true, 'Lấy danh sách đơn hàng thành công', orders);
  } catch (err) {
    next(err);
  }
});

// POST / - Admin/Staff place order (POS)
router.post('/', verifyJWT, requireRole(['ADMIN', 'MANAGER', 'STAFF']), async (req, res, next) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);
    const employeeId = req.user?.EmployeeID;
    if (!employeeId) throw new AppError(401, 'Unauthorized');

    let baseTotal = 0;
    for (const item of validatedData.Items) {
      baseTotal += item.UnitPrice * item.Quantity;
    }
    const finalPrice = validatedData.TotalPrice || baseTotal;

    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.orders.create({
        data: {
          CustomerID: validatedData.CustomerID || null,
          ShopTableID: validatedData.ShopTableID || null,
          EmployeeID: employeeId,
          OrderStatus: 'PENDING',
          TotalPrice: finalPrice,
          OrderNote: validatedData.OrderNote || null,
          OrderType: validatedData.OrderType || (validatedData.ShopTableID ? 'DINE_IN' : 'TAKEAWAY'),
        },
      });

      await tx.orderDetail.createMany({
        data: validatedData.Items.map((item) => ({
          OrderID: order.OrderID,
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          Sugar: item.Sugar || '100%',
          Ice: item.Ice || '100%',
          Toppings: item.Toppings || null,
          UnitPrice: item.UnitPrice,
        })),
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

    return sendResponse(res, 201, true, 'Tạo đơn hàng thành công', newOrder);
  } catch (err) {
    next(err);
  }
});

// GET /refunds - Get all orders that need refund
router.get('/refunds', verifyJWT, requireRole(['ADMIN', 'MANAGER', 'STAFF']), async (req, res, next) => {
  try {
    const refunds = await prisma.orders.findMany({
      where: {
        OrderStatus: 'CANCELLED',
        PaymentStatus: 'PAID',
        RefundStatus: 'PENDING'
      },
      include: {
        Customer: { select: { CustomerName: true, PhoneNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return sendResponse(res, 200, true, 'Danh sách yêu cầu hoàn tiền', refunds);
  } catch (err) {
    next(err);
  }
});

// PUT /:id/refund - Admin mark refund as completed
router.put('/:id/refund', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    const order = await prisma.orders.findUnique({ where: { OrderID: orderId } });
    if (!order) throw new AppError(404, 'Order not found.');
    
    if (order.OrderStatus !== 'CANCELLED' || order.PaymentStatus !== 'PAID' || order.RefundStatus !== 'PENDING') {
      throw new AppError(400, 'Đơn hàng không hợp lệ để hoàn tiền.');
    }

    const updatedOrder = await prisma.orders.update({
      where: { OrderID: orderId },
      data: { RefundStatus: 'COMPLETED' }
    });

    return sendResponse(res, 200, true, 'Đã xác nhận hoàn tiền thành công.', updatedOrder);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/status - Update order status
router.patch('/:id/status', verifyJWT, requireRole(['ADMIN', 'MANAGER', 'STAFF', 'SHIPPER']), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = updateStatusSchema.parse(req.body);

    const order = await prisma.orders.findUnique({
      where: { OrderID: orderId },
      include: { OrderDetails: true },
    });

    if (!order) throw new AppError(404, 'Order not found.');

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Logic dedu trừ nguyên liệu / hoàn lại
      if (order.OrderStatus !== 'COMPLETED' && validatedData.OrderStatus === 'COMPLETED') {
        // Hoàn tất đơn -> trừ nguyên liệu
        await processOrderIngredients(tx, order.OrderDetails, 'deduct');

        // Check level upgrade
        if (order.CustomerID) {
          const cust = await tx.customer.findUnique({ where: { CustomerID: order.CustomerID } });
          if (cust) {
             const newTotal = cust.TotalMoneySpending + order.TotalPrice;
             await tx.customer.update({ where: { CustomerID: order.CustomerID }, data: { TotalMoneySpending: newTotal }});
             await upgradeCustomerLevel(tx, order.CustomerID, newTotal);
          }
        }
      } else if (order.OrderStatus !== 'CANCELLED' && validatedData.OrderStatus === 'CANCELLED') {
        // Hủy đơn -> hoàn nguyên liệu
        if (order.OrderStatus === 'COMPLETED') {
          await processOrderIngredients(tx, order.OrderDetails, 'refund');
          // Reverse spend
          if (order.CustomerID) {
            const cust = await tx.customer.findUnique({ where: { CustomerID: order.CustomerID } });
            if (cust) {
               const newTotal = Math.max(0, cust.TotalMoneySpending - order.TotalPrice);
               await tx.customer.update({ where: { CustomerID: order.CustomerID }, data: { TotalMoneySpending: newTotal }});
               await upgradeCustomerLevel(tx, order.CustomerID, newTotal);
            }
          }
        }
      }

      const updateData: any = { OrderStatus: validatedData.OrderStatus };
      if (validatedData.OrderStatus === 'CANCELLED' && order.PaymentStatus === 'PAID') {
         updateData.RefundStatus = 'PENDING';
      }

      // Update the status
      const updated = await tx.orders.update({
        where: { OrderID: orderId },
        data: updateData,
        include: {
          Customer: { select: { CustomerName: true, PhoneNumber: true } },
          ShopTable: { select: { ShopTableNumber: true } },
          Employee: { select: { FullName: true } },
          OrderDetails: {
            include: {
              DrinkSize: {
                include: {
                  Drink: { select: { DrinkName: true, DrinkImageURL: true } },
                  Size: { select: { SizeName: true } },
                },
              },
            },
          },
        }
      });
      return updated;
    });

    return sendResponse(res, 200, true, `Cập nhật trạng thái thành ${validatedData.OrderStatus}`, updatedOrder);
  } catch (err) {
    next(err);
  }
});

export default router;
