import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyJWT, requireRole, optionalAuth } from '../../middleware/auth';
import { sendResponse } from '../../utils/response';
import { queueNotification } from '../notifications/notifications.service';

const prisma = new PrismaClient();

const router = express.Router();

// Get all vouchers (Admin only)
router.get('/', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      include: {
        Customer: true,
        DrinkSize: { include: { Drink: true, Size: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return sendResponse(res, 200, true, 'Lấy danh sách voucher thành công', vouchers);
  } catch (err) {
    next(err);
  }
});

// Admin manually creates a voucher
router.post('/', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const { Code, DiscountType, DiscountValue, TargetProductID, OwnerID, ValidUntil, MaxUsage } = req.body;
    
    // Check if code exists
    const existing = await prisma.voucher.findUnique({ where: { Code } });
    if (existing) {
      return sendResponse(res, 400, false, 'Mã voucher đã tồn tại');
    }

    const type = DiscountType || 'PERCENT';
    if (DiscountValue <= 0) {
      return sendResponse(res, 400, false, 'Mức giảm giá phải lớn hơn 0');
    }
    if (type === 'PERCENT' && Number(DiscountValue) > 100) {
      return sendResponse(res, 400, false, 'Mức giảm giá theo phần trăm không được vượt quá 100%');
    }
    if (ValidUntil && new Date(ValidUntil) <= new Date()) {
      return sendResponse(res, 400, false, 'Thời hạn Voucher phải là một ngày trong tương lai');
    }

    const voucher = await prisma.voucher.create({
      data: {
        Code,
        DiscountType: DiscountType || 'PERCENT',
        DiscountValue,
        TargetProductID: TargetProductID || null,
        OwnerID: OwnerID || null,
        MaxUsage: MaxUsage ? Number(MaxUsage) : 1,
        Creator: 'ADMIN',
        ValidUntil: ValidUntil ? new Date(ValidUntil) : null,
        Status: 'ACTIVE'
      }
    });

    if (voucher.OwnerID) {
      queueNotification({
        customerId: voucher.OwnerID,
        title: 'Ting ting! Bạn có một Voucher mới 🎁',
        body: `Bạn vừa được tặng voucher giảm giá ${voucher.DiscountType === 'PERCENT' ? voucher.DiscountValue + '%' : voucher.DiscountValue + 'đ'}! Kiểm tra ngay trong Ví Voucher của bạn.`,
        type: 'PROMOTION',
        actionLink: '/',
        dataPayload: { voucherCode: voucher.Code }
      });
    }

    return sendResponse(res, 201, true, 'Tạo mã thành công', voucher);
  } catch (err) {
    next(err);
  }
});

// Update voucher status (Admin only)
router.put('/:id/status', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const voucherId = Number(req.params.id);
    const { Status } = req.body;
    
    if (isNaN(voucherId)) {
      return sendResponse(res, 400, false, 'ID voucher không hợp lệ');
    }
    
    if (!['ACTIVE', 'INACTIVE'].includes(Status)) {
      return sendResponse(res, 400, false, 'Trạng thái không hợp lệ');
    }
    
    const existing = await prisma.voucher.findUnique({ where: { VoucherID: voucherId } });
    if (!existing) {
      return sendResponse(res, 404, false, 'Không tìm thấy voucher');
    }
    
    if (Status === 'ACTIVE') {
      if (existing.ValidUntil && new Date(existing.ValidUntil) < new Date()) {
        return sendResponse(res, 400, false, 'Không thể kích hoạt voucher đã quá hạn sử dụng');
      }
      if (existing.UsedCount >= existing.MaxUsage) {
        return sendResponse(res, 400, false, 'Không thể kích hoạt voucher đã hết lượt sử dụng');
      }
    }
    
    const updated = await prisma.voucher.update({
      where: { VoucherID: voucherId },
      data: { Status }
    });
    
    return sendResponse(res, 200, true, 'Cập nhật trạng thái thành công', updated);
  } catch (err) {
    next(err);
  }
});

// Claim voucher (Customer saves voucher to wallet)
router.post('/claim', verifyJWT, requireRole(['CUSTOMER']), async (req, res, next) => {
  try {
    const customerId = req.user?.CustomerID;
    const { Code } = req.body;
    
    if (!customerId) return sendResponse(res, 401, false, 'Unauthorized');
    if (!Code) return sendResponse(res, 400, false, 'Vui lòng cung cấp mã Voucher');

    const voucher = await prisma.voucher.findUnique({ where: { Code } });
    if (!voucher) return sendResponse(res, 404, false, 'Mã Voucher không tồn tại');
    
    if (voucher.Status !== 'ACTIVE') return sendResponse(res, 400, false, 'Mã Voucher này đã bị vô hiệu hóa');
    if (voucher.ValidUntil && new Date(voucher.ValidUntil) < new Date()) return sendResponse(res, 400, false, 'Mã Voucher đã hết hạn');
    
    // Check if max usage reached globally
    const totalClaimed = await prisma.customerVoucher.count({ where: { VoucherID: voucher.VoucherID } });
    if (totalClaimed >= voucher.MaxUsage) {
      return sendResponse(res, 400, false, 'Rất tiếc, mã Voucher này đã hết số lượng phát hành!');
    }

    // Check if already claimed
    const existingClaim = await prisma.customerVoucher.findUnique({
      where: { CustomerID_VoucherID: { CustomerID: customerId, VoucherID: voucher.VoucherID } }
    });

    if (existingClaim) {
      return sendResponse(res, 400, false, 'Bạn đã lưu mã Voucher này rồi!');
    }

    // Claim it
    await prisma.customerVoucher.create({
      data: {
        CustomerID: customerId,
        VoucherID: voucher.VoucherID,
      }
    });

    return sendResponse(res, 200, true, 'Lưu Voucher thành công!');
  } catch (err) {
    next(err);
  }
});


// Check voucher validity (Public/Customer)
router.post('/check', async (req, res, next) => {
  try {
    const { Code, CustomerID, TargetProductID } = req.body;
    
    if (!Code) {
      return sendResponse(res, 400, false, 'Vui lòng nhập mã giảm giá');
    }

    const voucher = await prisma.voucher.findUnique({
      where: { Code },
      include: {
        DrinkSize: { include: { Drink: true, Size: true } }
      }
    });

    if (!voucher) {
      return sendResponse(res, 404, false, 'Mã giảm giá không tồn tại');
    }

    if (voucher.UsedCount >= voucher.MaxUsage) {
      return sendResponse(res, 400, false, 'Mã giảm giá đã hết lượt sử dụng');
    }

    if (voucher.ValidUntil && new Date(voucher.ValidUntil) < new Date()) {
      return sendResponse(res, 400, false, 'Mã giảm giá đã hết hạn');
    }

    if (voucher.Status !== 'ACTIVE') {
      return sendResponse(res, 400, false, 'Mã giảm giá đã bị vô hiệu hóa hoặc thu hồi');
    }

    if (voucher.OwnerID && voucher.OwnerID !== CustomerID) {
      return sendResponse(res, 403, false, 'Mã giảm giá không dành cho tài khoản này');
    }

    // Target product validation is usually done at the frontend before applying, but we can do a strict check here
    if (voucher.TargetProductID && TargetProductID && voucher.TargetProductID !== TargetProductID) {
      return sendResponse(res, 400, false, 'Mã giảm giá không áp dụng cho sản phẩm này');
    }

    return sendResponse(res, 200, true, 'Mã hợp lệ', voucher);
  } catch (err) {
    next(err);
  }
});

// Get vouchers for a specific customer
router.get('/customer/:customerId', optionalAuth, async (req, res, next) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId || isNaN(Number(customerId))) {
      return sendResponse(res, 400, false, 'ID khách hàng không hợp lệ');
    }

    // BẢO MẬT: Ngăn chặn rò rỉ thông tin cá nhân
    if (!req.user || req.user.CustomerID !== Number(customerId)) {
       return sendResponse(res, 403, false, 'Forbidden: Cannot access other customer vouchers');
    }

    const rawVouchers = await prisma.voucher.findMany({
      where: {
        OR: [
          { OwnerID: Number(customerId) },
          { ClaimedBy: { some: { CustomerID: Number(customerId) } } }
        ],
        AND: [
          {
            OR: [
              { ValidUntil: null },
              { ValidUntil: { gt: new Date() } }
            ]
          }
        ]
      },
      include: {
        DrinkSize: { include: { Drink: true, Size: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const vouchers = rawVouchers.filter(v => v.UsedCount < v.MaxUsage);

    return sendResponse(res, 200, true, 'Lấy danh sách voucher thành công', vouchers);
  } catch (err) {
    next(err);
  }
});

// Get public available vouchers (to claim)
router.get('/public/available', async (req, res, next) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        OwnerID: null,
        Status: 'ACTIVE',
        OR: [
          { ValidUntil: null },
          { ValidUntil: { gt: new Date() } }
        ]
      },
      include: {
        DrinkSize: { include: { Drink: true, Size: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const activeVouchers = vouchers.filter(v => v.UsedCount < v.MaxUsage);

    return sendResponse(res, 200, true, 'Lấy danh sách voucher thành công', activeVouchers);
  } catch (err) {
    next(err);
  }
});

export default router;
