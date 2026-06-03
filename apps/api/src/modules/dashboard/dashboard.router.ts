import { Router } from 'express';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';

const router = Router();

// Protect routes
router.use(verifyJWT);

// GET / - Retrieve live stats for store management dashboard
router.get('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
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

    return sendResponse(res, 200, true, 'Dashboard statistics compiled successfully', {
      todayRevenue,
      todayOrdersCount,
      lowStockCount,
      lowStockAlerts,
      bestSellers,
      monthlyRevenueChart: monthlyData,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
