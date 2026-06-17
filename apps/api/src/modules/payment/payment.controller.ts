import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createZaloPayOrder = async (req: Request, res: Response) => {
  try {
    const { orderId, amount, description } = req.body;
    
    // In a real integration, we'd sign the request and call ZaloPay Sandbox API
    // For this demo, we return a mock checkout URL
    const mockCheckoutUrl = `/sandbox-payment?orderId=${orderId}&amount=${amount}`;
    
    res.status(200).json({ 
      success: true, 
      data: { checkoutUrl: mockCheckoutUrl } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const callbackZaloPay = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (orderId) {
      await prisma.orders.update({
        where: { OrderID: Number(orderId) },
        data: { OrderStatus: 'COMPLETED' }
      });
    }
    res.status(200).json({ return_code: 1, return_message: 'success' });
  } catch (error) {
    res.status(500).json({ return_code: 0, return_message: 'error' });
  }
};
