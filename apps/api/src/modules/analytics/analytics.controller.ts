import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';

export const triggerHUI = async (req: Request, res: Response) => {
    try {
        // Mặc định threshold là 100,000 VND (Có thể tinh chỉnh dựa trên độ lớn của data)
        const threshold = req.body.threshold ? Number(req.body.threshold) : 100000;
        const result = await AnalyticsService.runHUI(threshold);
        return sendResponse(res, 200, true, 'Khai phá dữ liệu HUI thành công', result);
    } catch (error) {
        console.error("HUI Error:", error);
        return sendResponse(res, 500, false, 'Lỗi khi chạy thuật toán HUI', error);
    }
};

export const getHUIResults = async (req: Request, res: Response) => {
    try {
        const results = await prisma.highUtilityItemset.findMany({
            orderBy: { Rank: 'asc' },
            take: 50
        });

        // Enrich data với thông tin sản phẩm thực tế
        const enrichedResults = await Promise.all(results.map(async (hui) => {
            const itemIds: number[] = JSON.parse(hui.Itemset);
            const drinks = await prisma.drinkSize.findMany({
                where: { DrinkSizeID: { in: itemIds } },
                include: { Drink: true, Size: true }
            });
            return {
                ...hui,
                Items: drinks.map(d => ({
                    DrinkSizeID: d.DrinkSizeID,
                    DrinkName: d.Drink.DrinkName,
                    SizeName: d.Size.SizeName,
                    UnitPrice: d.UnitPrice,
                    ImageURL: d.Drink.DrinkImageURL
                }))
            };
        }));

        return sendResponse(res, 200, true, 'Lấy kết quả HUI thành công', enrichedResults);
    } catch (error) {
        console.error("HUI Get Error:", error);
        return sendResponse(res, 500, false, 'Lỗi khi lấy dữ liệu HUI', error);
    }
};
