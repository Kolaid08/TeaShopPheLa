import { prisma } from '../../utils/prisma';
import { getFirebaseAdmin } from '../../config/firebase';

export const processNotificationQueue = async () => {
  try {
    // 1. Fetch pending or failed jobs (up to a limit, say 50 at a time)
    // Only retry up to 3 times
    const jobs = await prisma.notificationQueue.findMany({
      where: {
        Status: { in: ['PENDING', 'FAILED'] },
        RetryCount: { lt: 3 },
      },
      take: 50,
      orderBy: { createdAt: 'asc' }, // Older first
    });

    if (jobs.length === 0) return;

    // Lock jobs by setting them to PROCESSING
    const jobIds = jobs.map((job) => job.JobID);
    await prisma.notificationQueue.updateMany({
      where: { JobID: { in: jobIds } },
      data: { Status: 'PROCESSING' },
    });

    const admin = getFirebaseAdmin();
    if (!admin) {
      // Firebase not configured, mark as failed (or 'SENT' for dummy testing)
      await prisma.notificationQueue.updateMany({
        where: { JobID: { in: jobIds } },
        data: { 
          Status: 'FAILED',
          ErrorMessage: 'Firebase Admin not configured. Push skipped.',
          RetryCount: { increment: 1 }
        },
      });
      return;
    }

    // Process each job
    for (const job of jobs) {
      try {
        // Find all active tokens for this customer
        const tokens = await prisma.customerToken.findMany({
          where: { CustomerID: job.CustomerID, IsActive: true, Provider: 'FCM' },
        });

        if (tokens.length === 0) {
          // No active tokens, mark as FAILED but don't retry (waste of time)
          await prisma.notificationQueue.update({
            where: { JobID: job.JobID },
            data: { Status: 'FAILED', ErrorMessage: 'No active FCM tokens found.', RetryCount: 3 }, // Max retry to skip
          });
          continue;
        }

        const tokenValues = tokens.map((t) => t.TokenValue);

        // Prepare FCM Message
        const message = {
          notification: {
            title: job.Title,
            body: job.Body,
          },
          data: job.DataPayload ? JSON.parse(job.DataPayload) : {},
          tokens: tokenValues,
        };

        // Send via FCM Multicast (to multiple devices of the same user)
        const response = await admin.messaging().sendEachForMulticast(message);
        
        let hasSuccess = response.successCount > 0;
        let errorMessage = null;

        // Cleanup invalid tokens (if Firebase says token is invalid/unregistered)
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp: any, idx: number) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered'
              ) {
                failedTokens.push(tokenValues[idx]!);
              }
            }
          });

          if (failedTokens.length > 0) {
            await prisma.customerToken.updateMany({
              where: { TokenValue: { in: failedTokens } },
              data: { IsActive: false },
            });
          }
          
          if (!hasSuccess) {
             errorMessage = 'All tokens failed.';
          }
        }

        await prisma.notificationQueue.update({
          where: { JobID: job.JobID },
          data: {
            Status: hasSuccess ? 'SENT' : 'FAILED',
            ErrorMessage: errorMessage,
            RetryCount: hasSuccess ? job.RetryCount : job.RetryCount + 1,
          },
        });

      } catch (jobError: any) {
        // Handle unexpected error for this specific job
        await prisma.notificationQueue.update({
          where: { JobID: job.JobID },
          data: {
            Status: 'FAILED',
            ErrorMessage: jobError.message || 'Unknown error',
            RetryCount: job.RetryCount + 1,
          },
        });
      }
    }

  } catch (error) {
    console.error('Error in processNotificationQueue:', error);
  }
};
