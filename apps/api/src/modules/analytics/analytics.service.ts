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

    /**
     * Sinh dữ liệu hóa đơn ảo (Mock Data) có thiên vị (Bias) để test thuật toán Apriori
     * @param numOrders Số lượng hóa đơn muốn sinh
     */
    public static async generateBiasedMockData(numOrders: number = 200) {
        const drinkSizes = await prisma.drinkSize.findMany({
            take: 10,
            select: { DrinkSizeID: true, UnitPrice: true }
        });

        if (drinkSizes.length < 4) {
            return { success: false, message: 'Cần ít nhất 4 món trên menu để sinh data' };
        }

        // Tạo nhân viên ảo nếu chưa có (để gắn vào Order)
        let employee = await prisma.employee.findFirst();
        if (!employee) {
            return { success: false, message: 'Vui lòng tạo ít nhất 1 nhân viên trước' };
        }

        const biasA = drinkSizes[0]; // Món A
        const biasB = drinkSizes[1]; // Món B (Mua A thì rất hay mua B)
        const biasC = drinkSizes[2]; // Món C
        const biasD = drinkSizes[3]; // Món D (Mua C thì rất hay mua D)
        const others = drinkSizes.slice(4); // Các món khác

        let createdCount = 0;

        for (let i = 0; i < numOrders; i++) {
            const items = [];
            const r = Math.random();

            // Kịch bản thiên vị (Bias Scenarios)
            if (r < 0.3) {
                // 30% hóa đơn: Mua A và B (Tạo Rule: A -> B)
                items.push(biasA, biasB);
                if (others.length > 0 && Math.random() < 0.2) items.push(others[Math.floor(Math.random() * others.length)]); // Random thêm
            } else if (r < 0.5) {
                // 20% hóa đơn: Mua C và D (Tạo Rule: C -> D)
                items.push(biasC, biasD);
            } else if (r < 0.6) {
                // 10% hóa đơn: Mua A nhưng không mua B (Giảm confidence A -> B một chút)
                items.push(biasA);
                if (others.length > 0) items.push(others[Math.floor(Math.random() * others.length)]);
            } else {
                // 40% hóa đơn: Random lộn xộn
                const numItems = Math.floor(Math.random() * 3) + 1; // 1 đến 3 món
                for (let k = 0; k < numItems; k++) {
                    if (others.length > 0) {
                        items.push(others[Math.floor(Math.random() * others.length)]);
                    }
                }
            }

            // Loại bỏ món trùng lắp hoặc undefined trong cùng 1 hóa đơn
            const validItems = items.filter(i => i !== undefined);
            const uniqueItems = Array.from(new Set(validItems.map(i => i.DrinkSizeID)))
                .map(id => validItems.find(i => i.DrinkSizeID === id)!);

            if (uniqueItems.length === 0) continue;

            const totalPrice = uniqueItems.reduce((sum, item) => sum + Number(item.UnitPrice), 0);

            await prisma.orders.create({
                data: {
                    EmployeeID: employee.EmployeeID,
                    OrderStatus: 'COMPLETED',
                    OrderType: 'TAKEAWAY',
                    TotalPrice: totalPrice,
                    OrderDetails: {
                        create: uniqueItems.map(item => ({
                            DrinkSizeID: item.DrinkSizeID,
                            Quantity: 1,
                            UnitPrice: item.UnitPrice
                        }))
                    }
                }
            });
            createdCount++;
        }

        return { success: true, message: `Đã sinh thành công ${createdCount} hóa đơn có thiên vị (Bias)` };
    }
}
