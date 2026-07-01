import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';
import { GhnService } from './ghn.service';

const router = Router();

// GET /api/v1/shipping/provinces - Lấy danh sách Tỉnh/Thành
router.get('/provinces', async (req, res, next) => {
  try {
    const data = await GhnService.getProvinces();
    return sendResponse(res, 200, true, 'Danh sách Tỉnh/Thành phố', data);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/shipping/districts/:provinceId - Lấy Quận/Huyện
router.get('/districts/:provinceId', async (req, res, next) => {
  try {
    const provinceId = parseInt(req.params.provinceId);
    const data = await GhnService.getDistricts(provinceId);
    return sendResponse(res, 200, true, 'Danh sách Quận/Huyện', data);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/shipping/wards/:districtId - Lấy Phường/Xã
router.get('/wards/:districtId', async (req, res, next) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const data = await GhnService.getWards(districtId);
    return sendResponse(res, 200, true, 'Danh sách Phường/Xã', data);
  } catch (err) {
    next(err);
  }
});

// Payload để tính phí ship
const calculateFeeSchema = z.object({
  to_district_id: z.number().int(),
  to_ward_code: z.string(),
  items: z.array(
    z.object({
      DrinkSizeID: z.number().int(),
      Quantity: z.number().int().positive(),
    })
  ).min(1),
});

// POST /api/v1/shipping/calculate-fee - Tính phí ship trước khi chốt đơn
router.post('/calculate-fee', async (req, res, next) => {
  try {
    const validatedData = calculateFeeSchema.parse(req.body);

    // Tính tổng khối lượng dựa vào DrinkSizeID -> Size -> WeightGram
    let totalWeight = 0;
    let insuranceValue = 0;

    for (const item of validatedData.items) {
      const drinkSize = await prisma.drinkSize.findUnique({
        where: { DrinkSizeID: item.DrinkSizeID },
        include: { Size: true },
      });

      if (drinkSize) {
        totalWeight += (drinkSize.Size.WeightGram || 500) * item.Quantity;
        insuranceValue += drinkSize.UnitPrice.toNumber() * item.Quantity;
      }
    }

    // Nếu giỏ hàng nhẹ quá (vd: 0g), đưa về mức mặc định 500g để GHN không báo lỗi
    if (totalWeight <= 0) totalWeight = 500;

    const fee = await GhnService.calculateFee({
      to_district_id: validatedData.to_district_id,
      to_ward_code: validatedData.to_ward_code,
      weight: totalWeight,
      insurance_value: insuranceValue,
    });

    return sendResponse(res, 200, true, 'Phí vận chuyển tính toán thành công', { fee, totalWeight });
  } catch (err) {
    next(err);
  }
});

export default router;
