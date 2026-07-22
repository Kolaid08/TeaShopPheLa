import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { processNotificationQueue } from '../modules/notifications/notifications.worker';
import { queueNotification } from '../modules/notifications/notifications.service';

// Chạy job mỗi 1 giờ
export const startCronJobs = () => {
  console.log('⏳ Khởi tạo Cron Jobs...');

  // '0 * * * *' = Mỗi giờ vào phút thứ 0
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Bắt đầu chạy quét Giỏ Hàng Bỏ Quên (Abandoned Carts)...');
    try {
      await processAbandonedCarts();
    } catch (error) {
      console.error('❌ Lỗi khi chạy job Abandoned Carts:', error);
    }
  });

  // Chạy mỗi 30 giây để xử lý hàng đợi thông báo
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await processNotificationQueue();
    } catch (error) {
      console.error('❌ Lỗi khi chạy job processNotificationQueue:', error);
    }
  });
};

const processAbandonedCarts = async () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. Tìm các giỏ hàng ACTIVE không cập nhật trong 24h, có chứa sản phẩm
  const abandonedCarts = await prisma.cart.findMany({
    where: {
      Status: 'ACTIVE',
      updatedAt: { lt: twentyFourHoursAgo },
      CustomerID: { not: null }, // Phải có tài khoản mới tặng mã được
      CartItems: { some: {} }, // Phải có sản phẩm bên trong
    },
    include: {
      CartItems: true,
    },
  });

  if (abandonedCarts.length === 0) {
    console.log('✅ Không có giỏ hàng nào bị bỏ quên hôm nay.');
    return;
  }

  console.log(`🔍 Tìm thấy ${abandonedCarts.length} giỏ hàng bị bỏ quên có tài khoản khách hàng.`);

  for (const cart of abandonedCarts) {
    // 2. Logic Giá trị tối thiểu (Ví dụ: Tổng tiền > 0, có thể nâng lên tuỳ ý sau này)
    // Hiện tại do chưa lấy chi tiết giá nên cứ có cart là tính.

    // 3. Logic Cool-down (Kiểm tra xem khách đã được tặng mã COMEBACK trong 30 ngày qua chưa)
    const recentVoucher = await prisma.voucher.findFirst({
      where: {
        OwnerID: cart.CustomerID,
        Code: { startsWith: 'COMEBACK-' },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    if (recentVoucher) {
      // Khách này đã nhận mã COMEBACK gần đây -> Spam -> Không tạo mã nữa, chỉ đánh dấu ABANDONED
      console.log(`🚫 Khách hàng ID ${cart.CustomerID} đang cố spam. Chuyển giỏ hàng sang ABANDONED (Không tặng mã).`);
      await prisma.cart.update({
        where: { CartID: cart.CartID },
        data: { Status: 'ABANDONED' },
      });
      continue;
    }

    // Khách hàng hợp lệ -> Tặng mã
    const code = `COMEBACK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // Hạn 3 ngày

    await prisma.$transaction(async (tx) => {
      // Đổi trạng thái giỏ hàng
      await tx.cart.update({
        where: { CartID: cart.CartID },
        data: { Status: 'ABANDONED_NOTIFIED' },
      });

      // Tạo voucher
      await tx.voucher.create({
        data: {
          Code: code,
          DiscountType: 'PERCENT',
          DiscountValue: 15,
          OwnerID: cart.CustomerID,
          Creator: 'SYSTEM_CRON',
          ValidUntil: validUntil,
          MaxUsage: 1,
          UsedCount: 0,
        },
      });
    });

    console.log(`🎁 Đã tự động gửi mã ${code} (15% off) cho khách hàng ID ${cart.CustomerID}`);

    if (cart.CustomerID) {
      await queueNotification({
        customerId: cart.CustomerID,
        title: 'Bạn để quên gì đó này! 🎁',
        body: `Tặng bạn voucher 15% (Mã: ${code}) để hoàn tất giỏ hàng nhé. Hạn dùng 3 ngày!`,
        type: 'PROMOTION',
        actionLink: '/cart',
      });
    }
  }
};
