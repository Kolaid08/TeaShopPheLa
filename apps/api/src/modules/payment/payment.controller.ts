import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PayOS } from '@payos/node';

const prisma = new PrismaClient();

// Initialize PayOS instance.
// Ensure these keys are set in your .env file
export const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'dummy_client_id',
  apiKey: process.env.PAYOS_API_KEY || 'dummy_api_key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'dummy_checksum_key',
});

export const createPayOSOrder = async (req: Request, res: Response) => {
  try {
    const { orderId, amount, description, cancelUrl, returnUrl } = req.body;
    
    // In PayOS, orderCode must be a number <= 9007199254740991
    const orderCode = Number(orderId);
    
    // Check if offline/mock is needed. If keys are dummy, just return static mock
    if (!process.env.PAYOS_CLIENT_ID || process.env.PAYOS_CLIENT_ID === 'dummy_client_id') {
       return res.status(200).json({ 
         success: true, 
         data: { 
           checkoutUrl: `/payment/mock/${orderId}`, 
           qrCode: `https://img.vietqr.io/image/mbbank-7414012005-compact2.png?amount=${amount}&addInfo=PHELA${orderId}&accountName=NGUYEN%20VAN%20KHOA`
         } 
       });
    }

    const orderBody = {
      orderCode,
      amount: Number(amount),
      description: description || `PHELA${orderCode}`,
      cancelUrl: cancelUrl || 'http://localhost:3000/history',
      returnUrl: returnUrl || 'http://localhost:3000/history',
    };

    const paymentLinkRes = await payos.paymentRequests.create(orderBody);

    res.status(200).json({ 
      success: true, 
      data: { 
        checkoutUrl: paymentLinkRes.checkoutUrl,
        qrCode: paymentLinkRes.qrCode, // Text string of VietQR
        accountNumber: paymentLinkRes.accountNumber,
        bin: paymentLinkRes.bin,
        description: paymentLinkRes.description,
        amount: paymentLinkRes.amount,
      } 
    });
  } catch (error: any) {
    console.error('PayOS create payment error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Server error' });
  }
};

export const payOSWebhook = async (req: Request, res: Response) => {
  try {
    const webhookData = await payos.webhooks.verify(req.body);
    
    // In PayOS node v2, verify() returns the webhook data directly if valid
    if (webhookData && webhookData.orderCode) {
      const orderCode = webhookData.orderCode;
      
      // Update PaymentStatus = 'PAID' (We leave OrderStatus unchanged so it stays PENDING as COD)
      // We also update PaymentMethod to 'QR_CODE' just in case.
      await prisma.orders.update({
        where: { OrderID: Number(orderCode) },
        data: { 
            PaymentStatus: 'PAID',
            PaymentMethod: 'QR_CODE'
        }
      });
      console.log(`[PayOS Webhook] Payment confirmed for OrderID: ${orderCode}`);
    }
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('PayOS webhook error:', error.message);
    // PayOS requires 200 OK { success: true } in ALL cases, even if verification fails.
    res.status(200).json({ success: true, message: error?.message });
  }
};
