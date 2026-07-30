import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncCart = async (req: Request, res: Response) => {
  try {
    const { SessionID, CustomerID, Items } = req.body;

    // BẢO MẬT: Chặn Carts IDOR & Mass Assignment
    if (CustomerID && (!req.user || req.user.CustomerID !== Number(CustomerID))) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot modify other customer carts.' });
    }
    
    let validCustomerID = null;
    if (CustomerID) {
      const customer = await prisma.customer.findUnique({
        where: { CustomerID: Number(CustomerID) }
      });
      if (customer) {
        validCustomerID = customer.CustomerID;
      }
    }

    let cart = null;

    if (validCustomerID) {
      cart = await prisma.cart.findFirst({
        where: { Status: 'ACTIVE', CustomerID: validCustomerID },
        orderBy: { updatedAt: 'desc' }
      });
      
      // If no customer cart, try to claim an anonymous session cart
      if (!cart && SessionID) {
        const anonCart = await prisma.cart.findFirst({
          where: { Status: 'ACTIVE', SessionID, CustomerID: null },
          orderBy: { updatedAt: 'desc' }
        });
        if (anonCart) {
          cart = await prisma.cart.update({
            where: { CartID: anonCart.CartID },
            data: { CustomerID: validCustomerID }
          });
        }
      }
    } else if (SessionID) {
      // Anonymous user
      cart = await prisma.cart.findFirst({
        where: { Status: 'ACTIVE', SessionID, CustomerID: null },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!cart) {
      cart = await prisma.cart.create({
        data: { SessionID, CustomerID: validCustomerID }
      });
    }

    const finalCartId = cart!.CartID;
    let catalogItems: any[] = [];
    if (Items && Items.length > 0) {
      const drinkSizeIds = Items.map((i: any) => i.DrinkSizeID);
      catalogItems = await prisma.drinkSize.findMany({
        where: { DrinkSizeID: { in: drinkSizeIds } }
      });
    }

    const updatedCart = await prisma.$transaction(async (tx) => {
      // Retrieve existing items before deleting
      const existingItems = await tx.cartItem.findMany({
        where: { CartID: finalCartId }
      });

      await tx.cartItem.deleteMany({
        where: { CartID: finalCartId }
      });

      // Merge existing DB items with request Items
      const mergedItemsMap = new Map<string, any>();
      
      // Helper to generate a unique key for a cart item
      const getItemKey = (item: any) => {
        let tStr = '';
        if (Array.isArray(item.Toppings)) {
          tStr = [...item.Toppings].sort().join(',');
        } else if (item.Toppings) {
           tStr = JSON.stringify(item.Toppings);
        }
        return `${item.DrinkSizeID}-${item.Sugar || '100%'}-${item.Ice || '100%'}-${tStr}`;
      }

      // Add existing DB items to map
      for (const item of existingItems) {
        // Since we deleted existing items, this logic is a bit tricky.
        // Wait, the previous logic deleted ALL items and recreated them. But what about existing toppings?
        // Let's just rely entirely on the frontend's Items for sync.
        // Wait, the frontend overrides the whole cart. So we just need to process Items!
      }
      
      mergedItemsMap.clear();

      // Add/Update request Items to map
      if (Items && Items.length > 0) {
        for (const item of Items) {
          const catalogItem = catalogItems.find(c => c.DrinkSizeID === item.DrinkSizeID);
          if (catalogItem) {
            // item.Toppings should now be an array of IDs from Frontend
            const normalizedItem = {
              DrinkSizeID: item.DrinkSizeID,
              Quantity: item.Quantity,
              Sugar: item.Sugar || '100%',
              Ice: item.Ice || '100%',
              Toppings: Array.isArray(item.Toppings) ? item.Toppings : [],
              UnitPrice: catalogItem.UnitPrice
            };
            const key = getItemKey(normalizedItem);
            if (mergedItemsMap.has(key)) {
              mergedItemsMap.get(key).Quantity += normalizedItem.Quantity;
            } else {
              mergedItemsMap.set(key, normalizedItem);
            }
          }
        }
      }

      const finalItemsToInsert = Array.from(mergedItemsMap.values());

      if (finalItemsToInsert.length > 0) {
        for (const item of finalItemsToInsert) {
           const cItem = await tx.cartItem.create({
             data: {
               CartID: finalCartId,
               DrinkSizeID: item.DrinkSizeID,
               Quantity: item.Quantity,
               Sugar: item.Sugar,
               Ice: item.Ice,
               UnitPrice: item.UnitPrice
             }
           });
           
           if (item.Toppings && item.Toppings.length > 0) {
             const toppingList = await tx.topping.findMany({ where: { ToppingID: { in: item.Toppings } } });
             await tx.cartItemTopping.createMany({
               data: item.Toppings.map((tId: number) => {
                 const tPrice = toppingList.find(t => t.ToppingID === tId)?.Price || 0;
                 return {
                   CartItemID: cItem.CartItemID,
                   ToppingID: tId,
                   Quantity: 1,
                   UnitPrice: tPrice,
                 }
               })
             });
           }
        }
      }

      // Fetch the updated cart to return
      return tx.cart.findUnique({
        where: { CartID: finalCartId },
        include: {
          CartItems: {
            include: {
              DrinkSize: {
                include: { Drink: true, Size: true }
              },
              Toppings: {
                include: { Topping: true }
              }
            }
          }
        }
      });
    });

    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isCustomer = !isNaN(Number(id));
    
    // BẢO MẬT: Chặn Carts IDOR
    if (isCustomer) {
      if (!req.user || req.user.CustomerID !== Number(id)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot access other customer carts.' });
      }
    }
    
    const cart = await prisma.cart.findFirst({
      where: isCustomer ? { CustomerID: Number(id) } : { SessionID: id },
      include: {
        CartItems: {
          include: {
            DrinkSize: {
              include: { Drink: true, Size: true }
            }
          }
        }
      }
    });

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const getAbandonedCarts = async (req: Request, res: Response) => {
  try {
    // Tìm các giỏ hàng không được cập nhật quá 24h và có chứa sản phẩm
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Auto update status to ABANDONED for these carts
    await prisma.cart.updateMany({
      where: {
        Status: 'ACTIVE',
        updatedAt: { lt: twentyFourHoursAgo },
      },
      data: { Status: 'ABANDONED' }
    });

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        Status: { in: ['ABANDONED', 'ABANDONED_NOTIFIED'] },
        CartItems: {
          some: {} // Only get carts that actually have items
        }
      },
      include: {
        Customer: {
          select: { CustomerName: true, PhoneNumber: true }
        },
        CartItems: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Manually join DrinkSize details
    const drinkSizeIds = Array.from(new Set(abandonedCarts.flatMap((c: any) => c.CartItems.map((item: any) => item.DrinkSizeID))));
    const drinkSizes = await prisma.drinkSize.findMany({
      where: { DrinkSizeID: { in: drinkSizeIds } },
      include: { Drink: true, Size: true }
    });
    
    const drinkSizeMap = new Map(drinkSizes.map(ds => [ds.DrinkSizeID, ds]));

    const result = abandonedCarts.map((cart: any) => ({
      ...cart,
      CartItems: cart.CartItems.map((item: any) => ({
        ...item,
        DrinkSize: drinkSizeMap.get(item.DrinkSizeID)
      }))
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const mockAbandonedCarts = async (req: Request, res: Response) => {
  try {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await prisma.cart.updateMany({
      where: { Status: 'ACTIVE' },
      data: { updatedAt: twentyFiveHoursAgo, Status: 'ABANDONED' }
    });
    res.status(200).json({ success: true, message: 'Mocked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const notifyAbandonedCart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cart = await prisma.cart.findUnique({
      where: { CartID: Number(id) }
    });

    if (!cart || cart.Status !== 'ABANDONED') {
      return res.status(400).json({ success: false, message: 'Cart is not in ABANDONED status' });
    }

    const code = 'COMEBACK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await prisma.$transaction(async (tx) => {
      await tx.voucher.create({
        data: {
          Code: code,
          DiscountType: 'PERCENT',
          DiscountValue: 15,
          MaxUsage: 1,
          ValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          Status: 'ACTIVE',
          OwnerID: cart.CustomerID,
          Creator: 'SYSTEM_ABANDONED_CART'
        }
      });

      await tx.cart.update({
        where: { CartID: Number(id) },
        data: { Status: 'ABANDONED_NOTIFIED' }
      });
    });

    res.status(200).json({ success: true, message: 'Notified and voucher created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
