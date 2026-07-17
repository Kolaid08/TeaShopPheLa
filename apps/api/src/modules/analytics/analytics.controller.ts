import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';

export const triggerHUI = async (req: Request, res: Response) => {
    try {
        const threshold = req.body.threshold !== undefined ? Number(req.body.threshold) : 100000;
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

export const triggerApriori = async (req: Request, res: Response) => {
    try {
        const minSupport = req.body.minSupport !== undefined ? Number(req.body.minSupport) : 0.05;
        const minConfidence = req.body.minConfidence !== undefined ? Number(req.body.minConfidence) : 0.5;
        const result = await AnalyticsService.runApriori(minSupport, minConfidence);
        return sendResponse(res, 200, true, 'Khai phá dữ liệu Apriori thành công', result);
    } catch (error) {
        console.error("Apriori Error:", error);
        return sendResponse(res, 500, false, 'Lỗi khi chạy thuật toán Apriori', error);
    }
};

export const getAprioriResults = async (req: Request, res: Response) => {
    try {
        const results = await prisma.aprioriRule.findMany({
            orderBy: { Confidence: 'desc' },
            take: 50
        });

        // Enrich data với thông tin sản phẩm thực tế
        const enrichedResults = await Promise.all(results.map(async (rule) => {
            const antIds: number[] = JSON.parse(rule.Antecedent);
            const consIds: number[] = JSON.parse(rule.Consequent);

            const allIds = [...antIds, ...consIds];
            const drinks = await prisma.drinkSize.findMany({
                where: { DrinkSizeID: { in: allIds } },
                include: { Drink: true, Size: true }
            });

            return {
                ...rule,
                AntecedentItems: antIds.map(id => {
                    const d = drinks.find(dr => dr.DrinkSizeID === id);
                    return d ? { DrinkName: d.Drink.DrinkName, SizeName: d.Size.SizeName } : null;
                }),
                ConsequentItems: consIds.map(id => {
                    const d = drinks.find(dr => dr.DrinkSizeID === id);
                    return d ? { DrinkName: d.Drink.DrinkName, SizeName: d.Size.SizeName } : null;
                })
            };
        }));

        return sendResponse(res, 200, true, 'Lấy kết quả Apriori thành công', enrichedResults);
    } catch (error) {
        console.error("Apriori Get Error:", error);
        return sendResponse(res, 500, false, 'Lỗi khi lấy dữ liệu Apriori', error);
    }
};

export const triggerMockData = async (req: Request, res: Response) => {
    try {
        const numOrders = req.body.numOrders !== undefined ? Number(req.body.numOrders) : 200;
        const result = await AnalyticsService.generateBiasedMockData(numOrders);
        if (!result.success) {
            return sendResponse(res, 400, false, result.message);
        }
        return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
        console.error("Mock Data Error:", error);
        return sendResponse(res, 500, false, 'Lỗi khi sinh dữ liệu giả', error);
    }
};
