import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncCart = async (req: Request, res: Response) => {
  try {
    const { SessionID, CustomerID, Items } = req.body;
    
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

    await prisma.cartItem.deleteMany({
      where: { CartID: cart.CartID }
    });

    if (Items && Items.length > 0) {
      // BẢO MẬT: Lấy giá niêm yết từ DB thay vì tin tưởng giá Client gửi lên
      const drinkSizeIds = Items.map((i: any) => i.DrinkSizeID);
      const catalogItems = await prisma.drinkSize.findMany({
        where: { DrinkSizeID: { in: drinkSizeIds } }
      });

      await prisma.cartItem.createMany({
        data: Items.map((item: any) => {
          const catalogItem = catalogItems.find(c => c.DrinkSizeID === item.DrinkSizeID);
          if (!catalogItem) throw new Error(`DrinkSizeID ${item.DrinkSizeID} not found`);
          return {
            CartID: cart!.CartID,
            DrinkSizeID: item.DrinkSizeID,
            Quantity: item.Quantity,
            Sugar: item.Sugar || '100%',
            Ice: item.Ice || '100%',
            Toppings: JSON.stringify(item.Toppings || []),
            UnitPrice: catalogItem.UnitPrice
          };
        })
      });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isCustomer = !isNaN(Number(id));
    
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
        Status: 'ABANDONED',
        CartItems: {
          some: {} // Only get carts that actually have items
        }
      },
      include: {
        Customer: {
          select: { CustomerName: true, PhoneNumber: true, Email: true }
        },
        CartItems: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Manually join DrinkSize details
    const drinkSizeIds = Array.from(new Set(abandonedCarts.flatMap(c => c.CartItems.map(item => item.DrinkSizeID))));
    const drinkSizes = await prisma.drinkSize.findMany({
      where: { DrinkSizeID: { in: drinkSizeIds } },
      include: { Drink: true, Size: true }
    });
    
    const drinkSizeMap = new Map(drinkSizes.map(ds => [ds.DrinkSizeID, ds]));

    const result = abandonedCarts.map(cart => ({
      ...cart,
      CartItems: cart.CartItems.map(item => ({
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
