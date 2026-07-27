import { prisma } from '../../utils/prisma';

interface NotificationPayload {
  customerId: number;
  title: string;
  body: string;
  type: string; // 'PROMOTION', 'ORDER_UPDATE', 'SYSTEM'
  actionLink?: string;
  dataPayload?: any; // Extra data for push notifications
}

export const queueNotification = async (payload: NotificationPayload) => {
  try {
    // 1. Create In-App Notification (The Bell Icon)
    await prisma.userNotification.create({
      data: {
        CustomerID: payload.customerId,
        Title: payload.title,
        Body: payload.body,
        Type: payload.type,
        ActionLink: payload.actionLink,
        IsRead: false,
      },
    });

    // 2. Queue for Push Notification (Background Worker)
    // Only queue if the customer actually has active tokens (optimization)
    const activeTokens = await prisma.customerToken.count({
      where: { CustomerID: payload.customerId, IsActive: true },
    });

    if (activeTokens > 0) {
      await prisma.notificationQueue.create({
        data: {
          CustomerID: payload.customerId,
          Title: payload.title,
          Body: payload.body,
          DataPayload: payload.dataPayload ? JSON.stringify(payload.dataPayload) : null,
          Status: 'PENDING',
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error queueing notification:', error);
    return false;
  }
};
