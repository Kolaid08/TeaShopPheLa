import { Router } from 'express';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';

const router = Router();

// Protect routes
router.use(verifyJWT);

// GET / - Retrieve live stats for store management dashboard
router.get('/', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // 1. Today's Revenue (Completed Orders only)
    const revenueAgg = await prisma.orders.aggregate({
      where: {
        OrderStatus: 'COMPLETED',
        CreatedTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _sum: {
        TotalPrice: true,
      },
    });
    const todayRevenue = revenueAgg._sum.TotalPrice?.toNumber() || 0;

    // 2. Today's Total Orders Count
    const todayOrdersCount = await prisma.orders.count({
      where: {
        CreatedTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // 3. Low stock Alerts (Ingredients with stock < 10)
    const lowStockAlerts = await prisma.ingredient.findMany({
      where: {
        QuantityStock: {
          lt: 10.0,
        },
      },
      include: {
        Unit: { select: { UnitName: true } },
      },
      take: 5,
    });
    const lowStockCount = await prisma.ingredient.count({
      where: {
        QuantityStock: {
          lt: 10.0,
        },
      },
    });

    // 3.5 Expiring Ingredients (Remaining > 0 and ExpirationDate <= 30 days from now)
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringIngredients = await prisma.ingredientReceiptDetail.findMany({
      where: {
        QuantityRemaining: { gt: 0 },
        ExpirationDate: {
          lte: thirtyDaysFromNow
        }
      },
      include: {
        Ingredient: {
          include: { Unit: true }
        }
      },
      orderBy: { ExpirationDate: 'asc' }
    });


    // 4. Best-Selling Drinks (Top 5 all-time based on quantities sold in completed orders)
    const topSalesGroup = await prisma.orderDetail.groupBy({
      by: ['DrinkSizeID'],
      where: {
        Orders: {
          OrderStatus: 'COMPLETED',
        },
      },
      _sum: {
        Quantity: true,
      },
      orderBy: {
        _sum: {
          Quantity: 'desc',
        },
      },
      take: 5,
    });

    const bestSellers = [];
    for (const item of topSalesGroup) {
      const drinkSize = await prisma.drinkSize.findUnique({
        where: { DrinkSizeID: item.DrinkSizeID },
        include: {
          Drink: { select: { DrinkName: true } },
          Size: { select: { SizeName: true } },
        },
      });

      if (drinkSize) {
        bestSellers.push({
          DrinkSizeID: item.DrinkSizeID,
          DrinkName: drinkSize.Drink.DrinkName,
          SizeName: drinkSize.Size.SizeName,
          TotalSold: item._sum.Quantity || 0,
          UnitPrice: drinkSize.UnitPrice.toNumber(),
        });
      }
    }

    // 5. Monthly Revenue Chart Curve (current year grouped by month)
    const currentYear = today.getFullYear();
    const monthlyData = [];

    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(currentYear, month, 1);
      const endOfMonth = new Date(currentYear, month + 1, 0, 23, 59, 59);

      const monthRevenueAgg = await prisma.orders.aggregate({
        where: {
          OrderStatus: 'COMPLETED',
          CreatedTime: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          TotalPrice: true,
        },
      });

      monthlyData.push({
        month: startOfMonth.toLocaleString('en-US', { month: 'short' }),
        revenue: monthRevenueAgg._sum.TotalPrice?.toNumber() || 0,
      });
    }

    // 6. Abandoned Carts (Giỏ hàng bị bỏ quên)
    const abandonedCartsRaw = await prisma.cart.findMany({
      where: {
        Status: { in: ['ABANDONED', 'ABANDONED_NOTIFIED'] },
        CartItems: { some: {} },
      },
      include: {
        Customer: { select: { CustomerName: true, PhoneNumber: true } },
        CartItems: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20, // Limit to recent 20 for dashboard
    });

    // Manually join DrinkSize details
    const drinkSizeIds = Array.from(new Set(abandonedCartsRaw.flatMap(c => c.CartItems.map(item => item.DrinkSizeID))));
    const drinkSizes = await prisma.drinkSize.findMany({
      where: { DrinkSizeID: { in: drinkSizeIds } },
      include: { Drink: true, Size: true }
    });
    const drinkSizeMap = new Map(drinkSizes.map(ds => [ds.DrinkSizeID, ds]));

    const abandonedCarts = abandonedCartsRaw.map((cart) => ({
      CartID: cart.CartID,
      SessionID: cart.SessionID,
      Customer: cart.Customer,
      updatedAt: cart.updatedAt,
      TotalItems: cart.CartItems.reduce((acc, item) => acc + item.Quantity, 0),
      TotalPrice: cart.CartItems.reduce((acc, item) => acc + item.UnitPrice.toNumber() * item.Quantity, 0),
      ItemsPreview: cart.CartItems.map((item) => {
        const ds = drinkSizeMap.get(item.DrinkSizeID);
        return {
          DrinkName: ds?.Drink?.DrinkName || 'Sản phẩm xoá',
          SizeName: ds?.Size?.SizeName || '',
          Quantity: item.Quantity,
        };
      }),
    }));

    return sendResponse(res, 200, true, 'Dashboard statistics compiled successfully', {
      todayRevenue,
      todayOrdersCount,
      lowStockCount,
      lowStockAlerts,
      expiringIngredients,
      bestSellers,
      monthlyRevenueChart: monthlyData,
      abandonedCarts,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
