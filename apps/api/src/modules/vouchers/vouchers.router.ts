import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { sendResponse } from '../../utils/response';

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
    const { Code, DiscountType, DiscountValue, TargetProductID, OwnerID, ValidUntil } = req.body;
    
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
        Creator: 'ADMIN',
        ValidUntil: ValidUntil ? new Date(ValidUntil) : null,
      }
    });
    return sendResponse(res, 201, true, 'Tạo mã thành công', voucher);
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

    if (voucher.IsUsed) {
      return sendResponse(res, 400, false, 'Mã giảm giá đã được sử dụng');
    }

    if (voucher.ValidUntil && new Date(voucher.ValidUntil) < new Date()) {
      return sendResponse(res, 400, false, 'Mã giảm giá đã hết hạn');
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

export default router;
