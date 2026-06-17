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

    let cart = await prisma.cart.findFirst({
      where: {
        OR: [
          ...(SessionID ? [{ SessionID }] : []),
          ...(validCustomerID ? [{ CustomerID: validCustomerID }] : [])
        ]
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { SessionID, CustomerID: validCustomerID }
      });
    } else if (validCustomerID && !cart.CustomerID) {
      cart = await prisma.cart.update({
        where: { CartID: cart.CartID },
        data: { CustomerID: validCustomerID }
      });
    }

    await prisma.cartItem.deleteMany({
      where: { CartID: cart.CartID }
    });

    if (Items && Items.length > 0) {
      await prisma.cartItem.createMany({
        data: Items.map((item: any) => ({
          CartID: cart!.CartID,
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          Sugar: item.Sugar || '100%',
          Ice: item.Ice || '100%',
          Toppings: JSON.stringify(item.Toppings || []),
          UnitPrice: item.UnitPrice
        }))
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
