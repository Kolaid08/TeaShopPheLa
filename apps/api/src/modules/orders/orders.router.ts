import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
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

        await tx.ingredient.update({
          where: { IngredientID: detail.IngredientID },
          data: {
            QuantityStock: mode === 'deduct'
              ? { decrement: quantityToAdjust }
              : { increment: quantityToAdjust },
          },
        });
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
  ProvinceID: z.number().optional().nullable(),
  DistrictID: z.number().optional().nullable(),
  WardCode: z.string().optional().nullable(),
  Latitude: z.number().optional().nullable(),
  Longitude: z.number().optional().nullable(),
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
router.post('/customer-combos', async (req, res, next) => {
  try {
    const { drinkSizeIds } = req.body;
    if (!drinkSizeIds || !Array.isArray(drinkSizeIds) || drinkSizeIds.length === 0) {
      return sendResponse(res, 200, true, 'No combos', []);
    }

    try {
      // Fetch recent 500 orders containing these items to prevent SQL Server parameter limits (>2100)
      const ordersWithItems = await prisma.orderDetail.findMany({
        where: { DrinkSizeID: { in: drinkSizeIds } },
        select: { OrderID: true },
        orderBy: { OrderID: 'desc' },
        take: 500,
      });

      if (ordersWithItems.length === 0) {
        return sendResponse(res, 200, true, 'No combos', []);
      }

      const orderIds = Array.from(new Set(ordersWithItems.map(o => o.OrderID)));

      const otherItems = await prisma.orderDetail.findMany({
        where: {
          OrderID: { in: orderIds },
          DrinkSizeID: { notIn: drinkSizeIds }
        },
        include: {
          DrinkSize: { include: { Drink: true, Size: true } }
        }
      });

      const freqMap = new Map<number, { count: number, item: any }>();
      for (const item of otherItems) {
        if (!freqMap.has(item.DrinkSizeID)) {
          freqMap.set(item.DrinkSizeID, { count: 0, item });
        }
        freqMap.get(item.DrinkSizeID)!.count++;
      }

      const sorted = Array.from(freqMap.values()).sort((a, b) => b.count - a.count).slice(0, 3);
      
      const result = sorted.map(s => ({
        DrinkSizeID: s.item.DrinkSizeID,
        DrinkName: s.item.DrinkSize.Drink.DrinkName,
        SizeName: s.item.DrinkSize.Size.SizeName,
        UnitPrice: s.item.DrinkSize.UnitPrice,
        DrinkImageURL: s.item.DrinkSize.Drink.DrinkImageURL,
        FrequencyCount: s.count
      }));

      return sendResponse(res, 200, true, 'Combo suggestions', result);
    } catch {
      let orderIds = new Set<number>();
      for (const order of serverMockOrders) {
        if (order.OrderDetails) {
          for (const item of order.OrderDetails) {
            if (drinkSizeIds.includes(item.DrinkSizeID)) {
              orderIds.add(order.OrderID);
              break;
            }
          }
        }
      }

      if (orderIds.size === 0) return sendResponse(res, 200, true, 'No combos (Offline)', []);

      const freqMap = new Map<number, { count: number, item: any }>();
      for (const order of serverMockOrders) {
        if (orderIds.has(order.OrderID) && order.OrderDetails) {
          for (const item of order.OrderDetails) {
             if (!drinkSizeIds.includes(item.DrinkSizeID)) {
                if (!freqMap.has(item.DrinkSizeID)) {
                  freqMap.set(item.DrinkSizeID, { count: 0, item });
                }
                freqMap.get(item.DrinkSizeID)!.count++;
             }
          }
        }
      }

      const sorted = Array.from(freqMap.values()).sort((a, b) => b.count - a.count).slice(0, 3);
      const result = sorted.map(s => ({
        DrinkSizeID: s.item.DrinkSizeID,
        DrinkName: s.item.DrinkSize?.Drink?.DrinkName || mockDrinkSizesMap[s.item.DrinkSizeID]?.DrinkName || 'N/A',
        SizeName: s.item.DrinkSize?.Size?.SizeName || mockDrinkSizesMap[s.item.DrinkSizeID]?.SizeName || 'M',
        UnitPrice: s.item.UnitPrice,
        DrinkImageURL: null,
        FrequencyCount: s.count
      }));

      return sendResponse(res, 200, true, 'Combo suggestions (Offline Mode)', result);
    }
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
    } catch {
      const details: any[] = [];
      for (const order of serverMockOrders) {
        if (order.CustomerID === customerId && ['COMPLETED', 'PENDING', 'PREPARING', 'READY'].includes(order.OrderStatus)) {
           if (order.OrderDetails) {
             details.push(...order.OrderDetails);
           }
        }
      }
      
      if (details.length === 0) return sendResponse(res, 200, true, 'No frequent items (Offline)', []);

      const frequencyMap = new Map<number, { count: number, item: any, configs: any[] }>();
      for (const d of details) {
        if (!frequencyMap.has(d.DrinkSizeID)) {
          frequencyMap.set(d.DrinkSizeID, { count: 0, item: d, configs: [] });
        }
        const entry = frequencyMap.get(d.DrinkSizeID)!;
        entry.count += 1;
        entry.configs.push({ Sugar: d.Sugar || '100%', Ice: d.Ice || '100%', Toppings: d.Toppings || '' });
      }

      const sorted = Array.from(frequencyMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
      const result = sorted.map(s => {
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
          DrinkName: s.item.DrinkSize?.Drink?.DrinkName || mockDrinkSizesMap[s.item.DrinkSizeID]?.DrinkName || 'N/A',
          SizeName: s.item.DrinkSize?.Size?.SizeName || mockDrinkSizesMap[s.item.DrinkSizeID]?.SizeName || 'M',
          UnitPrice: s.item.UnitPrice,
          DrinkImageURL: null,
          FrequencyCount: s.count,
          PreferredConfig: { Sugar: sugar, Ice: ice, Toppings: toppings }
        };
      });

      return sendResponse(res, 200, true, 'Lấy danh sách món tủ thành công (Offline Mode)', result);
    }
  } catch (err) {
    next(err);
  }
});

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
            currentPromoDiscount = applicableItemsTotal * (promo.Value / 100);
          } else if (promo.Type === 'AMOUNT') {
            currentPromoDiscount = promo.Value;
          } else if (promo.Type === 'FREE_ITEM') {
            const applicableSorted = validatedData.Items
              .filter(i => !targetIds || targetIds.includes(i.DrinkSizeID))
              .sort((a, b) => a.UnitPrice - b.UnitPrice);
            
            let freeItemsToGive = promo.Value;
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
           voucherDiscountAmount = targetItemTotal * (voucher.DiscountValue / 100);
        } else {
           voucherDiscountAmount = voucher.DiscountValue;
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
            ProvinceID: validatedData.ProvinceID || null,
            DistrictID: validatedData.DistrictID || null,
            WardCode: validatedData.WardCode || null,
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

// PATCH /customer-cancel/:id - Public cancel endpoint for customers
router.patch('/customer-cancel/:id', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    try {
      const order = await prisma.orders.findUnique({
        where: { OrderID: orderId },
        include: { OrderDetails: true }
      });
      if (!order) throw new AppError(404, 'Order not found.');

      if (order.OrderStatus !== 'PENDING') {
        throw new AppError(400, 'Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý.');
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.orders.update({
          where: { OrderID: orderId },
          data: { OrderStatus: 'CANCELLED' }
        });

        return updated;
      });

      return sendResponse(res, 200, true, 'Đã hủy đơn hàng thành công.', updatedOrder);
    } catch (dbErr: any) {
      if (dbErr.statusCode === 400 || dbErr.statusCode === 404) throw dbErr;
      
      const idx = serverMockOrders.findIndex((o) => o.OrderID === orderId);
      if (idx === -1) throw new AppError(404, 'Order not found in server memory.');
      if (serverMockOrders[idx].OrderStatus !== 'PENDING') {
        throw new AppError(400, 'Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý.');
      }
      serverMockOrders[idx].OrderStatus = 'CANCELLED';
      return sendResponse(res, 200, true, 'Đã hủy đơn hàng thành công (Offline Mode).', serverMockOrders[idx]);
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
    
    let shippingFee = 0;
    let computedDistance: number | null = null;

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

      // 3. Compute base total pricing securely
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
            currentPromoDiscount = applicableItemsTotal * (promo.Value / 100);
          } else if (promo.Type === 'AMOUNT') {
            currentPromoDiscount = promo.Value;
          } else if (promo.Type === 'FREE_ITEM') {
            const applicableSorted = validatedData.Items
              .filter(i => !targetIds || targetIds.includes(i.DrinkSizeID))
              .sort((a, b) => a.UnitPrice - b.UnitPrice);
            
            const multiplier = Math.floor(applicableQuantity / promo.MinQuantity);
            let freeItemsToGive = promo.Value * multiplier;
            
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

      // 4. Calculate Customer Discount
      let discountRate = 0;
      let customerId = validatedData.CustomerID || null;
      if (customerId) {
        const customer = await prisma.customer.findUnique({
          where: { CustomerID: customerId },
          include: { MemberShipLevel: true },
        });
        if (!customer) {
          throw new AppError(404, 'The associated customer record was not found.');
        }
        discountRate = customer.MemberShipLevel.DiscountRate.toNumber();
      }

      // Check Voucher
      let voucherDiscountAmount = 0;
      let membershipDiscount = 0;
      let usedVoucherId = null;

      if (validatedData.VoucherCode) {
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

        if (voucher.DiscountType === 'PERCENT') {
           voucherDiscountAmount = targetItemTotal * (voucher.DiscountValue / 100);
        } else {
           voucherDiscountAmount = voucher.DiscountValue;
           if (voucherDiscountAmount > targetItemTotal) voucherDiscountAmount = targetItemTotal;
        }

        membershipDiscount = otherItemsTotal * (discountRate / 100);
        usedVoucherId = voucher.VoucherID;
      } else {
        membershipDiscount = (baseTotal * promoRatio) * (discountRate / 100);
      }

      const totalDiscount = promotionDiscountAmount + voucherDiscountAmount + membershipDiscount;
      let finalPrice = Math.max(0, baseTotal - totalDiscount);

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

        if (usedVoucherId) {
          // @ts-ignore
          await tx.voucher.update({
            where: { VoucherID: usedVoucherId },
            data: { IsUsed: true }
          });
        }

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
        }, 0) + shippingFee,
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

        // 4. Trừ nguyên liệu khi đơn hàng hoàn thành (COMPLETED)
        if (validatedData.OrderStatus === 'COMPLETED' && order.OrderStatus !== 'COMPLETED') {
          const orderDetails = await tx.orderDetail.findMany({
            where: { OrderID: orderId },
          });
          
          const itemsToDeduct = orderDetails.map((od: any) => ({
            DrinkSizeID: od.DrinkSizeID,
            Quantity: od.Quantity
          }));
          
          await processOrderIngredients(tx, itemsToDeduct, 'deduct');
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
router.patch('/:id/assign-shipper', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id || '');
    if (isNaN(orderId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = assignShipperSchema.parse(req.body);

    const order = await prisma.orders.findUnique({
      where: { OrderID: orderId },
      include: {
        OrderDetails: {
          include: { DrinkSize: { include: { Size: true, Drink: true } } }
        }
      }
    });

    if (!order) throw new AppError(404, 'Order not found.');

    if (order.OrderType !== 'DELIVERY') {
      throw new AppError(400, 'Chỉ có thể gán tài xế cho đơn Giao hàng (DELIVERY).');
    }

    if (order.OrderStatus !== 'PENDING' && order.OrderStatus !== 'PREPARING') {
      throw new AppError(400, 'Chỉ có thể gán tài xế khi đơn đang ở trạng thái Chờ xác nhận hoặc Đang pha chế.');
    }

    let ghnCode = null;
    if (validatedData.DeliveryMethod === 'THIRD_PARTY') {
      try {
        const items = order.OrderDetails.map((d) => ({
          name: d.DrinkSize.Drink.DrinkName,
          quantity: d.Quantity,
          price: d.UnitPrice.toNumber(),
          weight: d.DrinkSize.Size.WeightGram || 500,
        }));
        const totalWeight = items.reduce((acc, curr) => acc + curr.weight * curr.quantity, 0) || 500;

        const isCOD = (order.PaymentMethod === 'COD' || !order.PaymentMethod) && order.PaymentStatus !== 'PAID';
        ghnCode = await GhnService.createOrder({
          to_name: order.ReceiverName || 'Khách hàng',
          to_phone: order.ReceiverPhone || '0900000000',
          to_address: order.ShippingAddress || 'Không có địa chỉ',
          to_ward_code: order.WardCode || '20102', // Fallback to a default ward if not present
          to_district_id: order.DistrictID || 1442, // Fallback to a default district
          weight: totalWeight,
          insurance_value: order.TotalPrice.toNumber(),
          cod_amount: isCOD ? order.TotalPrice.toNumber() : 0,
          content: `Đơn hàng Phê La #${order.OrderID}`,
          items,
        });
      } catch (error: any) {
        throw new AppError(500, `Lỗi tạo đơn bên GHN: ${error.message}`);
      }
    }

    const updatedOrder = await prisma.orders.update({
      where: { OrderID: orderId },
      data: {
        OrderStatus: 'SHIPPING',
        DeliveryMethod: validatedData.DeliveryMethod,
        ShipperID: validatedData.DeliveryMethod === 'INTERNAL' ? validatedData.ShipperID : null,
        ThirdPartyShipperName: validatedData.DeliveryMethod === 'THIRD_PARTY' ? 'Giao Hàng Nhanh' : null,
        ThirdPartyShipperPhone: null, // GHN handles phone
        TrackingURL: ghnCode ? `https://donhang.ghn.vn/?order_code=${ghnCode}` : null,
        GHN_OrderCode: ghnCode,
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

// POST /ghn-webhook - Handle status updates from GHN (Bỏ qua verifyJWT vì GHN gọi)
router.post('/ghn-webhook', async (req, res, next) => {
  try {
    const { OrderCode, Status } = req.body;
    // Status từ GHN: 'ready_to_pick', 'picking', 'delivering', 'delivered', 'cancel', 'return'...
    if (OrderCode && Status) {
      const order = await prisma.orders.findFirst({ where: { GHN_OrderCode: OrderCode } });
      if (order) {
        let newStatus = order.OrderStatus;
        if (Status === 'delivering' || Status === 'picking') newStatus = 'SHIPPING';
        if (Status === 'delivered') {
           newStatus = 'COMPLETED';
           // Tích điểm & Nâng hạng thẻ khi giao thành công
           if (order.CustomerID) {
              await upgradeCustomerLevel(order.CustomerID, order.TotalPrice.toNumber());
           }
        }
        if (Status === 'cancel' || Status === 'return' || Status === 'returned') newStatus = 'DELIVERY_FAILED';

        if (newStatus !== order.OrderStatus) {
          await prisma.orders.update({
            where: { OrderID: order.OrderID },
            data: { OrderStatus: newStatus }
          });
          console.log(`[GHN Webhook] Order ${order.OrderID} status updated to ${newStatus}`);
        }
      }
    }
    return sendResponse(res, 200, true, 'Webhook received', null);
  } catch (err) {
    next(err);
  }
});

export default router;
