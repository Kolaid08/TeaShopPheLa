import { prisma } from '../../utils/prisma';

export const createSession = async (sessionId: string, customerId?: number) => {
  return await prisma.chatSession.create({
    data: {
      SessionID: sessionId,
      CustomerID: customerId || null,
      Status: 'AI_HANDLING',
    },
  });
};

export const getSessionById = async (sessionId: string) => {
  try {
    return await prisma.chatSession.findUnique({
      where: { SessionID: sessionId },
      include: { Messages: { orderBy: { createdAt: 'asc' } } },
    });
  } catch (error) {
    // If sessionId is not a valid UUID, SQL Server will throw an error
    return null;
  }
};

export const addMessage = async (sessionId: string, senderType: 'CUSTOMER' | 'AI' | 'ADMIN', content: string) => {
  return await prisma.chatMessage.create({
    data: {
      SessionID: sessionId,
      SenderType: senderType,
      Content: content,
    },
  });
};

export const updateSessionStatus = async (sessionId: string, status: 'AI_HANDLING' | 'WAITING_FOR_ADMIN' | 'ADMIN_HANDLING' | 'CLOSED') => {
  return await prisma.chatSession.update({
    where: { SessionID: sessionId },
    data: { Status: status },
  });
};

export const updateSessionCustomer = async (sessionId: string, customerId: number) => {
  return await prisma.chatSession.update({
    where: { SessionID: sessionId },
    data: { CustomerID: customerId },
  });
};

export const getAdminSessions = async () => {
  // Get active sessions (Waiting or Admin Handling) for the admin dashboard
  return await prisma.chatSession.findMany({
    where: {
      Status: {
        in: ['WAITING_FOR_ADMIN', 'ADMIN_HANDLING'],
      },
    },
    include: {
      Messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Get latest message for preview
      },
      Customer: {
        select: { CustomerName: true, PhoneNumber: true },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
};
