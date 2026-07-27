export interface Item {
  id: number;
  utility: number;
}

export interface Transaction {
  items: Item[];
  transactionUtility: number;
}

// ----------------------------------------------------------------------
// DATA STRUCTURES FOR HUI-MINER (Liu & Qu, 2012)
// ----------------------------------------------------------------------

interface Element {
  tid: number; // Transaction ID
  iutil: number; // Exact utility of the itemset in this transaction
  rutil: number; // Remaining utility of items appearing after this itemset
}

interface UtilityList {
  itemset: number[]; // The actual combination of items
  elements: Element[]; // List of occurrences in transactions
  sumIutil: number; // Sum of exact utilities (Total support utility)
  sumRutil: number; // Sum of remaining utilities (Upper bound for extensions)
}

export class HUIMiner {
  private minUtility: number;

  constructor(minUtility: number) {
    this.minUtility = minUtility;
  }

  public mine(transactions: Transaction[]) {
    const results: { itemset: number[]; utility: number; support: number }[] = [];

    // BƯỚC 1: Quét DB lần 1 tính toán TWU (Transaction-Weighted Utilization) cho từng item
    const twuMap = new Map<number, number>();
    for (const t of transactions) {
      for (const item of t.items) {
        twuMap.set(item.id, (twuMap.get(item.id) || 0) + t.transactionUtility);
      }
    }

    // BƯỚC 2: Cắt tỉa những phần tử rác (TWU < minUtility) và thiết lập Thứ tự (Order)
    const validItems = Array.from(twuMap.entries())
      .filter(([id, twu]) => twu >= this.minUtility)
      .map(([id]) => id)
      .sort((a, b) => {
        const diff = twuMap.get(a)! - twuMap.get(b)!;
        return diff !== 0 ? diff : a - b;
      });

    if (validItems.length === 0) return results;

    // BƯỚC 3: Quét DB lần 2 tạo Utility-List (Tính Remaining Utility từ phải qua trái)
    const mapItemToUtilityList = new Map<number, UtilityList>();
    for (const item of validItems) {
      mapItemToUtilityList.set(item, {
        itemset: [item],
        elements: [],
        sumIutil: 0,
        sumRutil: 0,
      });
    }

    // Create a global order map for fast O(1) sorting comparison
    const orderMap = new Map<number, number>();
    validItems.forEach((id, index) => orderMap.set(id, index));

    for (let tid = 0; tid < transactions.length; tid++) {
      const t = transactions[tid]!;

      // Remove invalid items from transaction and sort the remaining items by TWU rank
      const revisedItems = t.items
        .filter((i) => mapItemToUtilityList.has(i.id))
        .sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!);

      // Calculate remaining utility from right to left
      let remainingUtility = 0;
      for (let i = revisedItems.length - 1; i >= 0; i--) {
        const item = revisedItems[i]!;
        const uList = mapItemToUtilityList.get(item.id);

        if (uList) {
          const element: Element = {
            tid: tid,
            iutil: item.utility,
            rutil: remainingUtility,
          };
          uList.elements.push(element);
          uList.sumIutil += element.iutil;
          uList.sumRutil += element.rutil;
        }

        // The items before this one will have this item's utility added to their remaining utility
        remainingUtility += item.utility;
      }
    }

    // Prepare the list of 1-itemset utility lists
    const listOfUtilityLists: UtilityList[] = [];
    for (const item of validItems) {
      const uList = mapItemToUtilityList.get(item);
      if (uList) {
        listOfUtilityLists.push(uList);
      }
    }

    // 4. Start Depth-First Search (DFS)
    this.search(null, listOfUtilityLists, results);

    // Sort results by highest utility
    return results.sort((a, b) => b.utility - a.utility);
  }

  /**
   * Recursive DFS function to find High Utility Itemsets
   * @param P_UL Utility List of the prefix P (null for 1-itemsets)
   * @param uls Utility Lists of extensions (Px)
   * @param results Array to store the found combinations
   */
  private search(
    P_UL: UtilityList | null,
    uls: UtilityList[],
    results: { itemset: number[]; utility: number; support: number }[],
  ) {
    for (let i = 0; i < uls.length; i++) {
      const Px = uls[i]!;

      // If Px itself is a High Utility Itemset, save it
      if (Px.sumIutil >= this.minUtility) {
        results.push({
          itemset: Px.itemset,
          utility: Px.sumIutil,
          support: Px.elements.length,
        });
      }

      // BƯỚC 4: Cắt nhánh (Remaining Utility Pruning) & Đệ quy sâu (DFS)
      // Nếu tổng tiện ích hiện tại + tiện ích còn lại < minUtility thì chặt đứt nhánh đó.
      if (Px.sumIutil + Px.sumRutil >= this.minUtility) {
        const exULs: UtilityList[] = [];

        for (let j = i + 1; j < uls.length; j++) {
          const Py = uls[j]!;
          // BƯỚC 5: Giao cắt ma trận (Intersect) sinh tập hợp mới & tính Px + Py - P
          const PxyList = this.construct(P_UL, Px, Py);
          if (PxyList) {
            exULs.push(PxyList);
          }
        }

        // Recursively search deeper
        if (exULs.length > 0) {
          this.search(Px, exULs, results);
        }
      }
    }
  }

  /**
   * Constructs a new Utility-List for Pxy by intersecting elements of Px and Py
   */
  private construct(P: UtilityList | null, Px: UtilityList, Py: UtilityList): UtilityList | null {
    const Pxy: UtilityList = {
      itemset: [...Px.itemset, Py.itemset[Py.itemset.length - 1]!],
      elements: [],
      sumIutil: 0,
      sumRutil: 0,
    };

    let pxIndex = 0;
    let pyIndex = 0;

    // Fast intersection of two sorted lists (by transaction ID) in O(L)
    while (pxIndex < Px.elements.length && pyIndex < Py.elements.length) {
      const ex = Px.elements[pxIndex]!;
      const ey = Py.elements[pyIndex]!;

      if (ex.tid === ey.tid) {
        // Find the utility of the prefix P in this transaction
        let epIutil = 0;
        if (P !== null) {
          const ep = this.findElementByTid(P.elements, ex.tid);
          if (ep) {
            epIutil = ep.iutil;
          }
        }

        // Core formula of HUI-Miner:
        // iutil(Pxy) = iutil(Px) + iutil(Py) - iutil(P)
        const exy: Element = {
          tid: ex.tid,
          iutil: ex.iutil + ey.iutil - epIutil,
          rutil: ey.rutil, // The remaining utility of Pxy is identical to Py
        };

        Pxy.elements.push(exy);
        Pxy.sumIutil += exy.iutil;
        Pxy.sumRutil += exy.rutil;

        pxIndex++;
        pyIndex++;
      } else if (ex.tid < ey.tid) {
        pxIndex++;
      } else {
        pyIndex++;
      }
    }

    if (Pxy.elements.length === 0) return null;
    return Pxy;
  }

  /**
   * Binary search to quickly find an element by Transaction ID
   * Time Complexity: O(log L)
   */
  private findElementByTid(elements: Element[], tid: number): Element | undefined {
    let left = 0;
    let right = elements.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (elements[mid]!.tid === tid) return elements[mid];
      if (elements[mid]!.tid < tid) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return undefined;
  }
}
