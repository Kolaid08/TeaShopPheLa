import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendResponse } from '../../utils/response';

const prisma = new PrismaClient();

export const getAllPromotions = async (req: Request, res: Response) => {
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    sendResponse(res, 200, true, 'Lấy danh sách combo thành công', promotions);
  } catch (error) {
    sendResponse(res, 500, false, 'Lỗi máy chủ', error);
  }
};

export const getPromotionById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id || '');
    const promotion = await prisma.promotion.findUnique({
      where: { PromotionID: id }
    });
    if (!promotion) {
      return sendResponse(res, 404, false, 'Không tìm thấy combo');
    }
    sendResponse(res, 200, true, 'Lấy combo thành công', promotion);
  } catch (error) {
    sendResponse(res, 500, false, 'Lỗi máy chủ', error);
  }
};

export const createPromotion = async (req: Request, res: Response) => {
  try {
    const { Name, Description, Type, Value, MinQuantity, TargetDrinkIDs, IsActive, IsCombo, StartDate, EndDate } = req.body;
    
    if (Value <= 0) {
      return sendResponse(res, 400, false, 'Giá trị khuyến mãi phải lớn hơn 0');
    }
    if (Type === 'PERCENT' && Value > 100) {
      return sendResponse(res, 400, false, 'Mức giảm giá theo phần trăm không được vượt quá 100%');
    }
    if (StartDate && EndDate && new Date(StartDate) >= new Date(EndDate)) {
      return sendResponse(res, 400, false, 'Ngày kết thúc phải sau ngày bắt đầu');
    }

    const promotion = await prisma.promotion.create({
      data: {
        Name,
        Description,
        Type,
        Value,
        MinQuantity,
        TargetDrinkIDs: TargetDrinkIDs ? JSON.stringify(TargetDrinkIDs) : null,
        IsActive,
        IsCombo,
        StartDate: StartDate ? new Date(StartDate) : null,
        EndDate: EndDate ? new Date(EndDate) : null,
      }
    });
    sendResponse(res, 201, true, 'Tạo combo thành công', promotion);
  } catch (error) {
    sendResponse(res, 500, false, 'Lỗi máy chủ', error);
  }
};

export const updatePromotion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id || '');
    const { Name, Description, Type, Value, MinQuantity, TargetDrinkIDs, IsActive, IsCombo, StartDate, EndDate } = req.body;
    
    if (Value <= 0) {
      return sendResponse(res, 400, false, 'Giá trị khuyến mãi phải lớn hơn 0');
    }
    if (Type === 'PERCENT' && Value > 100) {
      return sendResponse(res, 400, false, 'Mức giảm giá theo phần trăm không được vượt quá 100%');
    }
    if (StartDate && EndDate && new Date(StartDate) >= new Date(EndDate)) {
      return sendResponse(res, 400, false, 'Ngày kết thúc phải sau ngày bắt đầu');
    }

    const promotion = await prisma.promotion.update({
      where: { PromotionID: id },
      data: {
        Name,
        Description,
        Type,
        Value,
        MinQuantity,
        TargetDrinkIDs: TargetDrinkIDs ? JSON.stringify(TargetDrinkIDs) : null,
        IsActive,
        IsCombo,
        StartDate: StartDate ? new Date(StartDate) : null,
        EndDate: EndDate ? new Date(EndDate) : null,
      }
    });
    sendResponse(res, 200, true, 'Cập nhật combo thành công', promotion);
  } catch (error) {
    sendResponse(res, 500, false, 'Lỗi máy chủ', error);
  }
};

export const deletePromotion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id || '');
    await prisma.promotion.delete({
      where: { PromotionID: id }
    });
    sendResponse(res, 200, true, 'Xóa combo thành công');
  } catch (error) {
    sendResponse(res, 500, false, 'Lỗi máy chủ', error);
  }
};

export const getChatboxCombos = async (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : null;
    
    // 1. Fetch all active combos
    const promotions = await prisma.promotion.findMany({
      where: {
        IsActive: true,
        IsCombo: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!customerId || isNaN(customerId)) {
      return sendResponse(res, 200, true, 'Lấy danh sách combo chatbox thành công', promotions);
    }

    // 2. Determine user preference
    const details = await prisma.orderDetail.findMany({
      where: {
        Orders: {
          CustomerID: customerId,
          OrderStatus: { in: ['COMPLETED', 'PENDING', 'PREPARING', 'READY'] },
        },
      },
      include: {
        DrinkSize: {
          include: { Drink: true },
        },
      },
      take: 100, // sample recent 100 items
    });

    const coffeeKeywords = ['cà phê', 'cafe', 'coffee', 'espresso', 'americano', 'latte', 'cappuccino', 'bạc xỉu', 'phin', 'cold brew', 'mocha'];
    let coffeeCount = 0;
    let milkTeaCount = 0;
    
    for (const d of details) {
       const name = d.DrinkSize?.Drink?.DrinkName?.toLowerCase() || '';
       const isCoffee = coffeeKeywords.some(kw => name.includes(kw));
       if (isCoffee) {
         coffeeCount++;
       } else {
         milkTeaCount++;
       }
    }
    
    let userPref = 'NEUTRAL';
    const totalDrinks = coffeeCount + milkTeaCount;
    if (totalDrinks > 0) {
      const coffeeRatio = coffeeCount / totalDrinks;
      if (coffeeRatio >= 0.6) userPref = 'COFFEE_LOVER';
      else if (coffeeRatio <= 0.4) userPref = 'MILK_TEA_LOVER';
    }

    // 3. Filter combos based on target drink names and user preference matrix
    const filteredPromotions = [];
    for (const promo of promotions) {
       let promoType = 'ALL_COMBO';
       
       if (promo.TargetDrinkIDs) {
          try {
            const targetIds: number[] = JSON.parse(promo.TargetDrinkIDs);
            if (targetIds.length > 0) {
              const drinks = await prisma.drinkSize.findMany({
                where: { DrinkSizeID: { in: targetIds } },
                include: { Drink: true }
              });
              
              let isAllCoffee = true;
              let isAllMilkTea = true;
              
              for (const ds of drinks) {
                const name = ds.Drink?.DrinkName?.toLowerCase() || '';
                const isCoffee = coffeeKeywords.some(kw => name.includes(kw));
                if (isCoffee) {
                  isAllMilkTea = false;
                } else {
                  isAllCoffee = false;
                }
              }
              
              if (isAllCoffee && !isAllMilkTea) promoType = 'COFFEE_COMBO';
              else if (isAllMilkTea && !isAllCoffee) promoType = 'MILK_TEA_COMBO';
              else promoType = 'MIXED_COMBO';
            }
          } catch(e) {}
       }
       
       // RECOMMENDATION MATRIX
       if (userPref === 'NEUTRAL') {
         filteredPromotions.push(promo); // Thấy TẤT CẢ
       } else if (userPref === 'COFFEE_LOVER') {
         if (promoType !== 'MILK_TEA_COMBO') filteredPromotions.push(promo); // Ẩn combo 100% Trà
       } else if (userPref === 'MILK_TEA_LOVER') {
         if (promoType !== 'COFFEE_COMBO') filteredPromotions.push(promo); // Ẩn combo 100% Cà phê
       }
    }

    sendResponse(res, 200, true, 'Lấy danh sách combo chatbox thành công', filteredPromotions);
  } catch (error) {
    sendResponse(res, 500, false, 'Lỗi máy chủ', error);
  }
};
