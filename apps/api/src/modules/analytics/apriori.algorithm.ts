export interface AssociationRule {
    antecedent: number[];
    consequent: number[];
    support: number; // Support của cả tập (A ∪ B)
    confidence: number;
    lift: number;
}

export class AprioriMiner {
    private minSupport: number;
    private minConfidence: number;

    constructor(minSupport: number = 0.05, minConfidence: number = 0.5) {
        this.minSupport = minSupport;
        this.minConfidence = minConfidence;
    }

    public mine(transactions: number[][]): AssociationRule[] {
        const numTransactions = transactions.length;
        if (numTransactions === 0) return [];

        // Hỗ trợ lưu trữ số đếm (Support Count) của tất cả Itemsets phổ biến
        const supportCountMap = new Map<string, number>();

        // 1. Tạo tập L1 (Frequent 1-itemsets)
        let L1 = this.getFrequent1Itemsets(transactions, numTransactions, supportCountMap);
        let currentL = L1;
        let k = 2;

        const allFrequentItemsets: number[][] = [...L1];

        // 2. Lặp sinh các tập phổ biến Ck, Lk
        while (currentL.length > 0) {
            const Ck = this.generateCandidates(currentL, k);
            const Lk = this.getFrequentKItemsets(transactions, Ck, numTransactions, supportCountMap);
            
            if (Lk.length === 0) {
                break;
            }

            allFrequentItemsets.push(...Lk);
            currentL = Lk;
            k++;
        }

        // 3. Sinh Luật (Association Rules)
        const rules = this.generateRules(allFrequentItemsets, supportCountMap, numTransactions);
        
        return rules.sort((a, b) => b.confidence - a.confidence);
    }

    private getFrequent1Itemsets(transactions: number[][], numTransactions: number, supportCountMap: Map<string, number>): number[][] {
        const countMap = new Map<number, number>();
        
        for (const t of transactions) {
            // Loại bỏ trùng lặp trong 1 hóa đơn
            const uniqueItems = new Set(t);
            for (const item of uniqueItems) {
                countMap.set(item, (countMap.get(item) || 0) + 1);
            }
        }

        const minCount = this.minSupport * numTransactions;
        const L1: number[][] = [];

        for (const [item, count] of countMap.entries()) {
            if (count >= minCount) {
                const itemset = [item];
                L1.push(itemset);
                supportCountMap.set(this.itemsetToString(itemset), count);
            }
        }

        // Cần sắp xếp L1 theo ID để dễ sinh Ck
        L1.sort((a, b) => a[0]! - b[0]!);
        return L1;
    }

    private getFrequentKItemsets(transactions: number[][], Ck: number[][], numTransactions: number, supportCountMap: Map<string, number>): number[][] {
        const countMap = new Map<string, number>();
        
        for (const t of transactions) {
            const tSet = new Set(t);
            for (const candidate of Ck) {
                // Kiểm tra xem candidate có nằm trong transaction t hay không
                let isSubset = true;
                for (const item of candidate) {
                    if (!tSet.has(item)) {
                        isSubset = false;
                        break;
                    }
                }

                if (isSubset) {
                    const key = this.itemsetToString(candidate);
                    countMap.set(key, (countMap.get(key) || 0) + 1);
                }
            }
        }

        const minCount = this.minSupport * numTransactions;
        const Lk: number[][] = [];

        for (const candidate of Ck) {
            const key = this.itemsetToString(candidate);
            const count = countMap.get(key) || 0;
            if (count >= minCount) {
                Lk.push(candidate);
                supportCountMap.set(key, count);
            }
        }

        return Lk;
    }

    private generateCandidates(LkMinus1: number[][], k: number): number[][] {
        const Ck: number[][] = [];
        const len = LkMinus1.length;

        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const itemset1 = LkMinus1[i]!;
                const itemset2 = LkMinus1[j]!;

                // Kiểm tra k-2 phần tử đầu tiên xem có giống nhau không
                let canMerge = true;
                for (let m = 0; m < k - 2; m++) {
                    if (itemset1[m] !== itemset2[m]) {
                        canMerge = false;
                        break;
                    }
                }

                if (canMerge) {
                    // Nếu giống nhau, gộp lại tạo tập có k phần tử
                    const newItemset = [...itemset1];
                    newItemset.push(itemset2[k - 2]!); // Thêm phần tử cuối cùng của itemset2
                    newItemset.sort((a, b) => a - b);
                    Ck.push(newItemset);
                }
            }
        }

        return Ck;
    }

    private generateRules(frequentItemsets: number[][], supportCountMap: Map<string, number>, numTransactions: number): AssociationRule[] {
        const rules: AssociationRule[] = [];

        // Chỉ sinh luật từ các tập có ít nhất 2 phần tử
        const validItemsets = frequentItemsets.filter(itemset => itemset.length >= 2);

        for (const itemset of validItemsets) {
            const itemsetKey = this.itemsetToString(itemset);
            const itemsetCount = supportCountMap.get(itemsetKey) || 0;
            const itemsetSupport = itemsetCount / numTransactions;

            // Lấy tất cả các tập con hợp lệ (trừ tập rỗng và chính nó)
            const subsets = this.getSubsets(itemset);

            for (const antecedent of subsets) {
                const consequent = itemset.filter(item => !antecedent.includes(item));
                
                const antecedentKey = this.itemsetToString(antecedent);
                const antecedentCount = supportCountMap.get(antecedentKey) || 0;
                
                if (antecedentCount > 0) {
                    const confidence = itemsetCount / antecedentCount;
                    
                    if (confidence >= this.minConfidence) {
                        const consequentKey = this.itemsetToString(consequent);
                        const consequentCount = supportCountMap.get(consequentKey) || 0;
                        const consequentSupport = consequentCount / numTransactions;
                        
                        const lift = confidence / consequentSupport;

                        rules.push({
                            antecedent,
                            consequent,
                            support: itemsetSupport,
                            confidence,
                            lift
                        });
                    }
                }
            }
        }

        return rules;
    }

    private getSubsets(arr: number[]): number[][] {
        const result: number[][] = [];
        const n = arr.length;
        
        // Dùng bitmask để sinh tất cả tập con (trừ tập rỗng 00..0 và tập đầy đủ 11..1)
        for (let i = 1; i < (1 << n) - 1; i++) {
            const subset: number[] = [];
            for (let j = 0; j < n; j++) {
                if ((i & (1 << j)) > 0) {
                    subset.push(arr[j]!);
                }
            }
            result.push(subset);
        }
        return result;
    }

    private itemsetToString(itemset: number[]): string {
        return itemset.join(',');
    }
}
