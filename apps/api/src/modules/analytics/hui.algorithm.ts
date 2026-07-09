export interface Item {
    id: number;
    utility: number;
}

export interface Transaction {
    items: Item[];
    transactionUtility: number;
}

export class HUIMiner {
    private minUtility: number;

    constructor(minUtility: number) {
        this.minUtility = minUtility;
    }

    public mine(transactions: Transaction[]) {
        const itemsets: { itemset: number[], utility: number, support: number }[] = [];
        
        // 1. Tính toán Tổng Tiện Ích Trọng Số (TWU) của tất cả hóa đơn chứa từng món
        const twuMap = new Map<number, number>();
        for (const t of transactions) {
            for (const item of t.items) {
                twuMap.set(item.id, (twuMap.get(item.id) || 0) + t.transactionUtility);
            }
        }

        // 2. Lọc ra các món có TWU đạt ngưỡng tối thiểu (minUtility) để đi tiếp
        const validItems = Array.from(twuMap.entries())
            .filter(([id, twu]) => twu >= this.minUtility)
            .map(([id]) => id)
            .sort((a, b) => (twuMap.get(a)! - twuMap.get(b)!)); // sắp xếp theo TWU tăng dần để tối ưu cho thuật toán DFS

        if (validItems.length === 0) return itemsets;

        // 3. Loại bỏ các món rác (TWU < minUtility) khỏi các hóa đơn để giảm tải bộ nhớ
        const revisedTransactions = transactions.map(t => {
            const items = t.items.filter(i => twuMap.get(i.id)! >= this.minUtility);
            items.sort((a, b) => (twuMap.get(a.id)! - twuMap.get(b.id)!));
            return { ...t, items };
        }).filter(t => t.items.length > 0);

        // 4. Chạy đệ quy (DFS) để tìm kiếm các Combo Vàng (HUI)
        this.explore(revisedTransactions, [], validItems, itemsets);

        // Sắp xếp các combo tìm được theo lợi nhuận giảm dần
        return itemsets.sort((a, b) => b.utility - a.utility);
    }

    private explore(
        transactions: Transaction[], 
        prefix: number[], 
        validItems: number[], 
        results: { itemset: number[], utility: number, support: number }[]
    ) {
        for (const item of validItems) {
            const newPrefix = [...prefix, item];
            
            let exactUtility = 0;
            let support = 0;
            const projectedTransactions: Transaction[] = [];
            let localTWU = 0;

            for (const t of transactions) {
                // Kiểm tra xem hóa đơn này có chứa món mới được thêm vào chuỗi (prefix) hay không
                const itemIds = t.items.map(i => i.id);
                if (itemIds.includes(item)) {
                    let utilityInTx = 0;
                    for (const id of newPrefix) {
                        const tItem = t.items.find(i => i.id === id);
                        if (tItem) {
                            utilityInTx += tItem.utility;
                        }
                    }
                    exactUtility += utilityInTx;
                    support++;
                    projectedTransactions.push(t);
                    localTWU += t.transactionUtility;
                }
            }

            // Lưu lại các combo có ít nhất 2 món (để gọi là combo) và đem lại tổng tiền lớn hơn ngưỡng tối thiểu
            if (exactUtility >= this.minUtility && newPrefix.length >= 2) {
                results.push({ itemset: newPrefix, utility: exactUtility, support });
            }

            // Điều kiện Cắt tỉa (Pruning): Nếu TWU cục bộ vẫn đủ lớn, ta có thể tiếp tục ghép thêm món mới vào chuỗi
            if (localTWU >= this.minUtility) {
                const itemIndex = validItems.indexOf(item);
                const extensions = validItems.slice(itemIndex + 1);
                if (extensions.length > 0) {
                    this.explore(projectedTransactions, newPrefix, extensions, results);
                }
            }
        }
    }
}
