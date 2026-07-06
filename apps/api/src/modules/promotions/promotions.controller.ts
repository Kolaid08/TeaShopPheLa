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
    const promotions = await prisma.promotion.findMany({
      where: {
        IsActive: true,
        IsCombo: true
      },
      orderBy: { createdAt: 'desc' }
    });
    sendResponse(res, 200, true, 'Lấy danh sách combo chatbox thành công', promotions);
  } catch (error) {
    sendResponse(res, 500, false, 'Lỗi máy chủ', error);
  }
};
