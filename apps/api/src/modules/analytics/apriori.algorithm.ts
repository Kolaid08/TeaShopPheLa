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

    const supportCountMap = new Map<string, number>();

    // BƯỚC 1: Quét DB tìm tập phổ biến 1-item ($L_1$)
    let L1 = this.getFrequent1Itemsets(transactions, numTransactions, supportCountMap);
    let currentL = L1;
    let k = 2;

    const allFrequentItemsets: number[][] = [...L1];

    // BƯỚC 4: Lặp lại đến khi không còn sinh ra được tập phổ biến nào (Vòng lặp while)
    while (currentL.length > 0) {
      // Tạo một Set chứa các chuỗi itemset của L_{k-1} để phục vụ cho bước Pruning O(1)
      const prevSet = new Set(currentL.map((s) => this.itemsetToString(s)));

      // BƯỚC 2: Sinh tập ứng viên C_k từ L_{k-1} (Bước Join & Prune)
      const Ck = this.generateCandidates(currentL, k, prevSet);
      if (Ck.length === 0) break;

      // BƯỚC 3: Quét DB đếm Support cho C_k để tạo ra L_k
      const Lk = this.getFrequentKItemsets(transactions, Ck, numTransactions, supportCountMap);

      if (Lk.length === 0) {
        break;
      }

      allFrequentItemsets.push(...Lk);
      currentL = Lk;
      k++;
    }

    // BƯỚC 5: Từ các tập phổ biến, sinh ra các Luật kết hợp (Rules) dựa trên Confidence
    const rules = this.generateRules(allFrequentItemsets, supportCountMap, numTransactions);

    return rules.sort((a, b) => b.confidence - a.confidence);
  }

  private getFrequent1Itemsets(
    transactions: number[][],
    numTransactions: number,
    supportCountMap: Map<string, number>,
  ): number[][] {
    const countMap = new Map<number, number>();

    for (const t of transactions) {
      // Loại bỏ trùng lặp trong 1 hóa đơn
      const uniqueItems = new Set(t);
      for (const item of uniqueItems) {
        countMap.set(item, (countMap.get(item) || 0) + 1);
      }
    }

    // Sử dụng Math.ceil để fix lỗi làm tròn thập phân (Tránh lỗi 0.9999)
    const minCount = Math.ceil(this.minSupport * numTransactions);
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

  private getFrequentKItemsets(
    transactions: number[][],
    Ck: number[][],
    numTransactions: number,
    supportCountMap: Map<string, number>,
  ): number[][] {
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

    // Sử dụng Math.ceil để fix lỗi làm tròn thập phân
    const minCount = Math.ceil(this.minSupport * numTransactions);
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

  public generateCandidates(LkMinus1: number[][], k: number, prevSet: Set<string>): number[][] {
    const Ck: number[][] = [];
    const len = LkMinus1.length;
    const seen = new Set<string>(); // Tránh sinh ứng viên trùng lặp

    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const itemset1 = LkMinus1[i]!;
        const itemset2 = LkMinus1[j]!;

        // Kiểm tra k-2 phần tử đầu tiên xem có giống nhau không (Join Step)
        let canMerge = true;
        for (let m = 0; m < k - 2; m++) {
          if (itemset1[m] !== itemset2[m]) {
            canMerge = false;
            break;
          }
        }

        // Quy tắc Join nghiêm ngặt: last(itemset1) phải < last(itemset2) để tránh lặp
        if (canMerge && itemset1[k - 2]! < itemset2[k - 2]!) {
          // Bản thân 2 mảng đã được sort, ghép item cuối cùng vào cũng sẽ tự động được sort
          const newItemset = [...itemset1, itemset2[k - 2]!];
          const key = this.itemsetToString(newItemset);

          if (seen.has(key)) continue;

          // APRIORI PRUNING STEP:
          // Mỗi tập con (k-1) của ứng viên đều bắt buộc phải là tập phổ biến (có trong prevSet)
          let isAllSubsetsFrequent = true;
          for (let subsetIndex = 0; subsetIndex < k; subsetIndex++) {
            // Sinh tập con (k-1) bằng cách bỏ đi phần tử ở vị trí subsetIndex
            const subset = newItemset.filter((_, idx) => idx !== subsetIndex);
            
            if (!prevSet.has(this.itemsetToString(subset))) {
              isAllSubsetsFrequent = false;
              break; // Cắt tỉa ngay lập tức (Candidate Pruning)
            }
          }

          if (isAllSubsetsFrequent) {
            seen.add(key);
            Ck.push(newItemset);
          }
        }
      }
    }

    return Ck;
  }

  private generateRules(
    frequentItemsets: number[][],
    supportCountMap: Map<string, number>,
    numTransactions: number,
  ): AssociationRule[] {
    const rules: AssociationRule[] = [];

    // Chỉ sinh luật từ các tập có ít nhất 2 phần tử
    const validItemsets = frequentItemsets.filter((itemset) => itemset.length >= 2);

    for (const itemset of validItemsets) {
      const itemsetKey = this.itemsetToString(itemset);
      const itemsetCount = supportCountMap.get(itemsetKey) || 0;

      // H1 là tập các hệ quả (consequents) có 1 phần tử
      const H1 = itemset.map(item => [item]);
      
      this.aprioriRuleGen(itemset, itemsetCount, H1, 1, supportCountMap, numTransactions, rules);
    }

    return rules;
  }

  /**
   * Thuật toán Apriori Rule Generation chuẩn (Rule Pruning)
   */
  private aprioriRuleGen(
    itemset: number[],
    itemsetCount: number,
    H_m: number[][],
    m: number,
    supportCountMap: Map<string, number>,
    numTransactions: number,
    rules: AssociationRule[]
  ) {
    const k = itemset.length;
    
    // Nếu độ dài tập hợp cha lớn hơn độ dài hệ quả đang xét
    if (k > m && H_m.length > 0) {
      const H_next: number[][] = [];
      
      for (const h of H_m) {
        // Tìm tiền đề (antecedent) bằng cách lấy itemset trừ đi hệ quả h
        const antecedent = itemset.filter(item => !h.includes(item));
        const antecedentKey = this.itemsetToString(antecedent);
        const antecedentCount = supportCountMap.get(antecedentKey) || 0;
        
        if (antecedentCount > 0) {
          const confidence = itemsetCount / antecedentCount;
          
          // RULE PRUNING: Nếu đủ minConfidence thì mới giữ lại h để mở rộng tiếp
          if (confidence >= this.minConfidence) {
            const consequentKey = this.itemsetToString(h);
            const consequentCount = supportCountMap.get(consequentKey) || 0;
            
            if (consequentCount > 0) {
              rules.push({
                antecedent,
                consequent: h,
                support: itemsetCount / numTransactions,
                confidence,
                lift: confidence / (consequentCount / numTransactions)
              });
            }
            
            H_next.push(h); // Giữ lại hệ quả h cho vòng sinh luật tiếp theo
          }
        }
      }
      
      // Mở rộng các hệ quả bằng cách Join chúng lại (vd: từ [A], [B] sinh ra [A, B])
      if (H_next.length > 1 && k > m + 1) {
        const prevSet = new Set(H_next.map(s => this.itemsetToString(s)));
        const H_m_plus_1 = this.generateCandidates(H_next, m + 1, prevSet);
        
        // Đệ quy
        this.aprioriRuleGen(itemset, itemsetCount, H_m_plus_1, m + 1, supportCountMap, numTransactions, rules);
      }
    }
  }

  private itemsetToString(itemset: number[]): string {
    return itemset.join(',');
  }
}
