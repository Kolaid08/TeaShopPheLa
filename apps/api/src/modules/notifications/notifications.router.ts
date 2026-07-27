import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Only authenticated customers can interact with their notifications
router.use(verifyJWT);
router.use(requireRole(['CUSTOMER']));

const tokenSchema = z.object({
  token: z.string().min(1),
  deviceName: z.string().optional(),
});

// POST /token - Register or update a push notification token (e.g. FCM token)
router.post('/token', async (req, res, next) => {
  try {
    const customerId = req.user?.CustomerID;
    if (!customerId) throw new AppError(401, 'Unauthorized');

    const validatedData = tokenSchema.parse(req.body);

    // Check if token already exists for this customer
    const existingToken = await prisma.customerToken.findFirst({
      where: {
        CustomerID: customerId,
        TokenValue: validatedData.token,
      },
    });

    if (existingToken) {
      // If it exists but is inactive, reactivate it
      if (!existingToken.IsActive) {
        await prisma.customerToken.update({
          where: { TokenID: existingToken.TokenID },
          data: { IsActive: true, DeviceName: validatedData.deviceName },
        });
      }
    } else {
      // Create new token mapping
      await prisma.customerToken.create({
        data: {
          CustomerID: customerId,
          Provider: 'FCM',
          TokenValue: validatedData.token,
          DeviceName: validatedData.deviceName || 'Web Browser',
          IsActive: true,
        },
      });
    }

    return sendResponse(res, 200, true, 'Token registered successfully');
  } catch (err) {
    next(err);
  }
});

// GET / - Get user's notifications (In-App Notification Center)
router.get('/', async (req, res, next) => {
  try {
    const customerId = req.user?.CustomerID;
    if (!customerId) throw new AppError(401, 'Unauthorized');

    const { page, limit, skip } = parsePagination(req.query);

    const [totalItems, notifications, unreadCount] = await prisma.$transaction([
      prisma.userNotification.count({
        where: { CustomerID: customerId },
      }),
      prisma.userNotification.findMany({
        where: { CustomerID: customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userNotification.count({
        where: { CustomerID: customerId, IsRead: false },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    // Also include a summary of unread count in the meta payload
    return sendResponse(res, 200, true, 'Notifications retrieved', notifications, {
      page,
      limit,
      totalItems,
      totalPages,
      unreadCount, // Send unread count for the bell icon badge
    });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/read - Mark a notification as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const customerId = req.user?.CustomerID;
    if (!customerId) throw new AppError(401, 'Unauthorized');

    const notificationId = parseInt(req.params.id || '');
    if (isNaN(notificationId)) throw new AppError(400, 'Invalid ID format.');

    // Ensure the notification belongs to the customer
    const notification = await prisma.userNotification.findFirst({
      where: { NotificationID: notificationId, CustomerID: customerId },
    });

    if (!notification) throw new AppError(404, 'Notification not found');

    await prisma.userNotification.update({
      where: { NotificationID: notificationId },
      data: { IsRead: true },
    });

    return sendResponse(res, 200, true, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
});

// PUT /read-all - Mark all notifications as read
router.put('/read-all', async (req, res, next) => {
  try {
    const customerId = req.user?.CustomerID;
    if (!customerId) throw new AppError(401, 'Unauthorized');

    await prisma.userNotification.updateMany({
      where: { CustomerID: customerId, IsRead: false },
      data: { IsRead: true },
    });

    return sendResponse(res, 200, true, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
});

export default router;
