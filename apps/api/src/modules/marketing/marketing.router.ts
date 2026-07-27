import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getIo } from '../chat/chat.socket';
import { getFirebaseAdmin } from '../../config/firebase';

const router = Router();

const broadcastSchema = z.object({
  Title: z.string().min(1, 'Vui lòng nhập tiêu đề'),
  Body: z.string().min(1, 'Vui lòng nhập nội dung'),
  Type: z.enum(['PROMOTION', 'VOUCHER_DROP']),
  VoucherCode: z.string().optional(),
  TargetLevelID: z.number().nullable().optional(), // null means all customers
});

router.post('/broadcast', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = broadcastSchema.parse(req.body);

    // 1. Lọc khách hàng
    const customerWhere = validatedData.TargetLevelID ? { LevelID: validatedData.TargetLevelID } : {};
    
    const targetCustomers = await prisma.customer.findMany({
      where: customerWhere,
      select: { CustomerID: true }
    });

    if (targetCustomers.length === 0) {
      return sendResponse(res, 400, false, 'Không tìm thấy khách hàng nào phù hợp với bộ lọc.');
    }

    const customerIds = targetCustomers.map(c => c.CustomerID);

    // 2. Tạo thông báo In-app (UserNotification)
    // Create notifications in bulk
    const notificationsToCreate = customerIds.map(id => ({
      CustomerID: id,
      Title: validatedData.Title,
      Body: validatedData.Body,
      Type: validatedData.Type,
      ActionLink: validatedData.Type === 'VOUCHER_DROP' ? '/vouchers' : '/',
    }));

    await prisma.userNotification.createMany({
      data: notificationsToCreate
    });

    // 3. Chuẩn bị payload
    const payload = {
      title: validatedData.Title,
      body: validatedData.Body,
      type: validatedData.Type,
      voucherCode: validatedData.VoucherCode,
      timestamp: new Date().toISOString()
    };

    // 4. Phát sóng Socket.io (Real-time Popup / Voucher Drop)
    try {
      const io = getIo();
      if (validatedData.TargetLevelID) {
        // If there's a filter, we must emit to individual rooms
        customerIds.forEach(id => {
           io.to(`customer_${id}`).emit('marketing_broadcast', payload);
        });
      } else {
        // Global broadcast
        io.to('customers_global').emit('marketing_broadcast', payload);
      }
    } catch (e) {
      console.error('Socket broadcast error:', e);
    }

    // 5. Gửi Push Notification (FCM)
    const firebaseAdmin = getFirebaseAdmin();
    if (firebaseAdmin) {
      const messaging = firebaseAdmin.messaging();
      
      // Get all active FCM tokens for the targeted customers
      const tokens = await prisma.customerToken.findMany({
        where: {
          CustomerID: { in: customerIds },
          IsActive: true,
          Provider: 'FCM'
        },
        select: { TokenValue: true }
      });

      const tokenValues = tokens.map(t => t.TokenValue);
      
      if (tokenValues.length > 0) {
        // FCM sendMulticast has a limit of 500 tokens per batch
        const BATCH_SIZE = 500;
        for (let i = 0; i < tokenValues.length; i += BATCH_SIZE) {
          const batch = tokenValues.slice(i, i + BATCH_SIZE);
          const message = {
            notification: {
              title: validatedData.Title,
              body: validatedData.Body,
            },
            data: {
              type: validatedData.Type,
              voucherCode: validatedData.VoucherCode || '',
            },
            tokens: batch,
          };
          
          messaging.sendEachForMulticast(message)
            .then((response: any) => {
              if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp: any, idx: number) => {
                  if (!resp.success && batch[idx]) {
                    failedTokens.push(batch[idx] as string);
                  }
                });
                console.log('List of tokens that caused failures: ' + failedTokens);
              }
            })
            .catch((error: any) => {
              console.error('Error sending multicast:', error);
            });
        }
      }
    } else {
      console.warn('Firebase admin is not initialized, skipping push notifications.');
    }

    return sendResponse(res, 200, true, `Đã gửi thông báo thành công tới ${customerIds.length} khách hàng!`);
  } catch (err) {
    next(err);
  }
});

export default router;
