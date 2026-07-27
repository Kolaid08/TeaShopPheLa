import { prisma } from '../../utils/prisma';
import { HUIMiner, Transaction, Item } from './hui.algorithm';
import { AprioriMiner } from './apriori.algorithm';

export class AnalyticsService {
    /**
     * Chạy thuật toán HUI trên tập dữ liệu hóa đơn hiện tại
     * @param minUtilityThreshold Ngưỡng Utility tối thiểu (VND) để một tập sản phẩm được coi là High Utility
     */
    public static async runHUI(minUtilityThreshold: number = 500000) {
        // Lấy tất cả các đơn hàng đã hoàn thành
        const orders = await prisma.orders.findMany({
            where: { OrderStatus: 'COMPLETED' },
            include: { OrderDetails: true }
        });

        const transactions: Transaction[] = [];

        for (const order of orders) {
            let transactionUtility = 0;
            const items: Item[] = [];

            // Gộp các món trùng lặp trong cùng 1 đơn hàng (VD: 2 ly trà sữa)
            const itemMap = new Map<number, number>(); // DrinkSizeID -> Utility

            for (const detail of order.OrderDetails) {
                const utility = detail.Quantity * Number(detail.UnitPrice);
                itemMap.set(detail.DrinkSizeID, (itemMap.get(detail.DrinkSizeID) || 0) + utility);
                transactionUtility += utility;
            }

            for (const [id, utility] of itemMap.entries()) {
                items.push({ id, utility });
            }

            if (items.length > 0) {
                transactions.push({ items, transactionUtility });
            }
        }

        // Chạy thuật toán
        const miner = new HUIMiner(minUtilityThreshold);
        const results = miner.mine(transactions);

        // Lấy Top 100 Combo mang lại doanh thu cao nhất
        const topResults = results.slice(0, 100);

        // Lưu vào bảng Cache
        await prisma.$transaction(async (tx) => {
            // Xóa cache cũ
            await tx.highUtilityItemset.deleteMany();
            
            if (topResults.length > 0) {
                await tx.highUtilityItemset.createMany({
                    data: topResults.map((r, index) => ({
                        Itemset: JSON.stringify(r.itemset),
                        TotalUtility: r.utility,
                        SupportCount: r.support,
                        Rank: index + 1
                    }))
                });
            }
        });

        return { minedCombinations: topResults.length, topResults };
    }

    /**
     * Chạy thuật toán Apriori chuẩn khoa học để sinh Association Rules
     * @param minSupport Ngưỡng hỗ trợ tối thiểu (VD: 0.05 -> 5% số đơn hàng)
     * @param minConfidence Ngưỡng tin cậy tối thiểu (VD: 0.5 -> 50% khả năng mua kèm)
     */
    public static async runApriori(minSupport: number = 0.05, minConfidence: number = 0.5) {
        const orders = await prisma.orders.findMany({
            where: { OrderStatus: 'COMPLETED' },
            include: { OrderDetails: true }
        });

        const transactions: number[][] = [];
        for (const order of orders) {
            const itemIds = order.OrderDetails.map(d => d.DrinkSizeID);
            if (itemIds.length > 0) {
                transactions.push(itemIds);
            }
        }

        const miner = new AprioriMiner(minSupport, minConfidence);
        const rules = miner.mine(transactions);

        await prisma.$transaction(async (tx) => {
            await tx.aprioriRule.deleteMany();
            if (rules.length > 0) {
                await tx.aprioriRule.createMany({
                    data: rules.map(r => ({
                        Antecedent: JSON.stringify(r.antecedent),
                        Consequent: JSON.stringify(r.consequent),
                        Support: r.support,
                        Confidence: r.confidence,
                        Lift: r.lift
                    }))
                });
            }
        });

        return { discoveredRules: rules.length, rules };
    }

}
