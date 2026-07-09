import { prisma } from '../../utils/prisma';
import { HUIMiner, Transaction, Item } from './hui.algorithm';

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
}
