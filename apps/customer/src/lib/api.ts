/**
 * strongly-typed API fetch client wrapper for Phêla Customer Storefront.
 * Engages dynamic Dual Mode: attempts real HTTP API queries, falling back seamlessly
 * to a full-featured client-side Local Storage Database mock.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Shared type signatures
export interface Drink {
  DrinkID: number;
  DrinkName: string;
  DrinkDescription?: string;
  DrinkImageURL?: string;
  DrinkStatus: string;
  createdAt: string;
}

export interface Size {
  SizeID: number;
  SizeName: string;
  Description?: string;
  VolumeML: number;
}

export interface DrinkSize {
  DrinkSizeID: number;
  DrinkID: number;
  SizeID: number;
  UnitPrice: number;
  DrinkSizeStatus: 'AVAILABLE' | 'UNAVAILABLE';
  Drink?: { DrinkName: string };
  Size?: { SizeName: string; VolumeML: number };
}

export interface Ingredient {
  IngredientID: number;
  IngredientName: string;
  QuantityStock: number;
  UnitID: number;
  Unit?: { UnitName: string };
}

export interface Unit {
  UnitID: number;
  UnitName: string;
}

export interface Customer {
  CustomerID: number;
  CustomerName: string;
  Email?: string;
  PhoneNumber: string;
  TotalMoneySpending: number;
  LevelID: number;
  MemberShipLevel?: {
    LevelName: string;
    DiscountRate: number;
  };
}

export interface MembershipLevel {
  LevelID: number;
  LevelName: string;
  DiscountRate: number;
  RequiredMoney: number;
}

export interface ShopTable {
  ShopTableID: number;
  ShopTableNumber: number;
}

export interface Order {
  OrderID: number;
  CustomerID?: number;
  ShopTableID?: number;
  EmployeeID?: number;
  CreatedTime: string;
  OrderStatus: 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
  TotalPrice: number;
  OrderNote?: string;
  Customer?: Customer;
  ShopTable?: ShopTable;
  OrderDetails?: OrderDetail[];
}

export interface OrderDetail {
  OrderID: number;
  DrinkSizeID: number;
  Quantity: number;
  UnitPrice: number;
  DrinkSize?: {
    Drink?: { DrinkName: string };
    Size?: { SizeName: string; VolumeML: number };
  };
}

// In-Memory Fallback Local Database (same initial items for mock mode consistency)
class LocalDatabase {
  drinks: Drink[] = [
    {
      DrinkID: 1,
      DrinkName: 'Trà Ô Long sữa Phêla',
      DrinkDescription: 'Chữ Phê trà đặc trưng kết hợp sữa ngậy',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 2,
      DrinkName: 'Trà sữa Oolong Nhài',
      DrinkDescription: 'Hương nhài thoang thoảng với trà oolong',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 3,
      DrinkName: 'Cà phê Cốt dừa Phêla',
      DrinkDescription: 'Cà phê Espresso cùng cốt dừa sánh mịn',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 4,
      DrinkName: 'Trà Ô Long trân châu',
      DrinkDescription: 'Oolong truyền thống kèm trân châu hoàng kim',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 5,
      DrinkName: 'Trà Ô Long Nhiệt Đới',
      DrinkDescription: 'Sự kết hợp hoàn hảo giữa trà ô long thượng hạng và trái cây nhiệt đới tươi mát',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 6,
      DrinkName: 'Cà Phê Trứng Phêla',
      DrinkDescription: 'Sự hòa quyện giữa vị đắng của espresso béo ngậy cùng kem trứng đánh bông',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 7,
      DrinkName: 'Trà Sữa Matcha Ô Long',
      DrinkDescription: 'Bột matcha Nhật Bản nguyên chất hòa quyện cùng cốt trà sữa ô long đậm vị',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 8,
      DrinkName: 'Cà Phê Espresso Sữa Đặc',
      DrinkDescription: 'Espresso chiết xuất đậm đặc hòa cùng sữa đặc truyền thống béo ngọt',
      DrinkImageURL: '',
      DrinkStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
  ];

  sizes: Size[] = [
    { SizeID: 1, SizeName: 'S', Description: 'Nhỏ', VolumeML: 360 },
    { SizeID: 2, SizeName: 'M', Description: 'Vừa', VolumeML: 500 },
    { SizeID: 3, SizeName: 'L', Description: 'Lớn', VolumeML: 700 },
  ];

  drinkSizes: DrinkSize[] = [
    { DrinkSizeID: 1, DrinkID: 1, SizeID: 1, UnitPrice: 45000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 2, DrinkID: 1, SizeID: 2, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 3, DrinkID: 1, SizeID: 3, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 4, DrinkID: 2, SizeID: 2, UnitPrice: 52000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 5, DrinkID: 2, SizeID: 3, UnitPrice: 62000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 6, DrinkID: 3, SizeID: 1, UnitPrice: 48000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 7, DrinkID: 3, SizeID: 2, UnitPrice: 58000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 8, DrinkID: 4, SizeID: 2, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 9, DrinkID: 4, SizeID: 3, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 10, DrinkID: 5, SizeID: 2, UnitPrice: 58000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 11, DrinkID: 5, SizeID: 3, UnitPrice: 68000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 12, DrinkID: 6, SizeID: 1, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 13, DrinkID: 6, SizeID: 2, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 14, DrinkID: 7, SizeID: 2, UnitPrice: 55000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 15, DrinkID: 7, SizeID: 3, UnitPrice: 65000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 16, DrinkID: 8, SizeID: 1, UnitPrice: 39000, DrinkSizeStatus: 'AVAILABLE' },
    { DrinkSizeID: 17, DrinkID: 8, SizeID: 2, UnitPrice: 49000, DrinkSizeStatus: 'AVAILABLE' },
  ];

  levels: MembershipLevel[] = [
    { LevelID: 1, LevelName: 'Đồng (Bronze)', DiscountRate: 0, RequiredMoney: 0 },
    { LevelID: 2, LevelName: 'Bạc (Silver)', DiscountRate: 5, RequiredMoney: 1000000 },
    { LevelID: 3, LevelName: 'Vàng (Gold)', DiscountRate: 10, RequiredMoney: 3000000 },
    { LevelID: 4, LevelName: 'Kim cương (Diamond)', DiscountRate: 15, RequiredMoney: 10000000 },
  ];

  customers: Customer[] = [
    { CustomerID: 1, CustomerName: 'Nguyễn Văn A', Email: 'ana@gmail.com', PhoneNumber: '0901122334', TotalMoneySpending: 1250000, LevelID: 2 },
    { CustomerID: 2, CustomerName: 'Trần Thị B', Email: 'btran@gmail.com', PhoneNumber: '0909988776', TotalMoneySpending: 3200000, LevelID: 3 },
  ];

  tables: ShopTable[] = [
    { ShopTableID: 1, ShopTableNumber: 1 },
    { ShopTableID: 2, ShopTableNumber: 2 },
    { ShopTableID: 3, ShopTableNumber: 3 },
    { ShopTableID: 4, ShopTableNumber: 4 },
  ];

  orders: Order[] = [];
}

const db = new LocalDatabase();

// Load persistent DB data from localStorage if exists
if (typeof window !== 'undefined') {
  const savedDrinks = localStorage.getItem('phela_db_drinks');
  if (savedDrinks) db.drinks = JSON.parse(savedDrinks);

  const savedCustomers = localStorage.getItem('phela_db_customers');
  if (savedCustomers) db.customers = JSON.parse(savedCustomers);

  const savedOrders = localStorage.getItem('phela_db_orders');
  if (savedOrders) db.orders = JSON.parse(savedOrders);
}

const saveLocalState = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('phela_db_drinks', JSON.stringify(db.drinks));
    localStorage.setItem('phela_db_customers', JSON.stringify(db.customers));
    localStorage.setItem('phela_db_orders', JSON.stringify(db.orders));
  }
};

const getSessionCustomer = (): Customer | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('phela_customer_user');
  return user ? JSON.parse(user) : null;
};

// Unified API connection client
export const api = {
  // CUSTOMER AUTHENTICATION (With auto-registration for new phones)
  customerLogin: async (phoneNumber: string, fullName = 'Khách Hàng Mới'): Promise<Customer> => {
    try {
      // In real mode, check if customer exists, else create one
      // (Since we are client-only, we first search via /customers on backend.
      // Because /customers is protected, we can attempt standard mock or fallback lookup)
      throw new Error('API Auth requires staff credentials; fallback to mock logic.');
    } catch {
      // Look up inside local database
      let cust = db.customers.find((c) => c.PhoneNumber === phoneNumber);
      
      // Auto-register if not found
      if (!cust) {
        cust = {
          CustomerID: db.customers.length + 1,
          CustomerName: fullName === 'Khách Hàng Mới' ? `Hội Viên Phêla ${phoneNumber.slice(-4)}` : fullName,
          PhoneNumber: phoneNumber,
          TotalMoneySpending: 0,
          LevelID: 1, // Bronze Level
        };
        db.customers.push(cust);
        saveLocalState();
      }

      // Map membership level info
      const level = db.levels.find((l) => l.LevelID === cust!.LevelID);
      cust.MemberShipLevel = level ? { LevelName: level.LevelName, DiscountRate: level.DiscountRate } : { LevelName: 'Đồng (Bronze)', DiscountRate: 0 };

      if (typeof window !== 'undefined') {
        localStorage.setItem('phela_customer_token', 'mock_cust_token_' + Date.now());
        localStorage.setItem('phela_customer_user', JSON.stringify(cust));
      }
      return cust;
    }
  },

  customerLogout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phela_customer_token');
      localStorage.removeItem('phela_customer_user');
    }
  },

  getCurrentCustomer: () => getSessionCustomer(),

  // DRINKS CATALOG
  getDrinks: async (): Promise<Drink[]> => {
    try {
      const res = await fetch(`${API_BASE}/drinks`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.drinks;
    }
  },

  getSizes: async (): Promise<Size[]> => {
    try {
      const res = await fetch(`${API_BASE}/sizes`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.sizes;
    }
  },

  getDrinkSizes: async (): Promise<DrinkSize[]> => {
    try {
      const res = await fetch(`${API_BASE}/drink-sizes`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.drinkSizes.map((ds) => ({
        ...ds,
        Drink: db.drinks.find((d) => d.DrinkID === ds.DrinkID),
        Size: db.sizes.find((s) => s.SizeID === ds.SizeID),
      }));
    }
  },

  getTables: async (): Promise<ShopTable[]> => {
    try {
      const res = await fetch(`${API_BASE}/shop-tables`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.tables;
    }
  },

  // ORDER SUBMISSIONS & HISTORY
  getCustomerOrders: async (): Promise<Order[]> => {
    const cust = getSessionCustomer();
    if (!cust) return [];

    try {
      const res = await fetch(`${API_BASE}/orders/customer-history/${cust.PhoneNumber}`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.orders
        .filter((o) => o.CustomerID === cust.CustomerID)
        .map((o) => ({
          ...o,
          Customer: db.customers.find((c) => c.CustomerID === o.CustomerID),
          ShopTable: db.tables.find((t) => t.ShopTableID === o.ShopTableID),
          OrderDetails: o.OrderDetails?.map((od) => {
            const ds = db.drinkSizes.find((ds) => ds.DrinkSizeID === od.DrinkSizeID);
            return {
              ...od,
              DrinkSize: {
                Drink: db.drinks.find((d) => d.DrinkID === ds?.DrinkID),
                Size: db.sizes.find((s) => s.SizeID === ds?.SizeID),
              },
            };
          }),
        }))
        .sort((a, b) => b.OrderID - a.OrderID);
    }
  },

  createCustomerOrder: async (data: {
    Items: { DrinkSizeID: number; Quantity: number; UnitPrice: number }[];
    TotalPrice: number;
    ShopTableID?: number;
    OrderNote?: string;
  }): Promise<Order> => {
    const cust = getSessionCustomer();
    
    try {
      const res = await fetch(`${API_BASE}/orders/customer-place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CustomerID: cust?.CustomerID || 1,
          CustomerName: cust?.CustomerName || 'Hội viên Phêla',
          CustomerPhoneNumber: cust?.PhoneNumber || '0900000000',
          ShopTableID: data.ShopTableID || undefined,
          OrderNote: data.OrderNote || undefined,
          TotalPrice: data.TotalPrice,
          Items: data.Items.map((item) => ({
            DrinkSizeID: item.DrinkSizeID,
            Quantity: item.Quantity,
          })),
        }),
      });
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      const newO: Order = {
        OrderID: db.orders.length + 1,
        CustomerID: cust?.CustomerID || 1,
        ShopTableID: data.ShopTableID || undefined,
        CreatedTime: new Date().toISOString(),
        OrderStatus: 'PENDING',
        TotalPrice: data.TotalPrice,
        OrderNote: data.OrderNote || undefined,
        OrderDetails: data.Items.map((item) => ({
          OrderID: db.orders.length + 1,
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          UnitPrice: item.UnitPrice,
        })),
      };

      db.orders.push(newO);
      saveLocalState();
      return newO;
    }
  },
};
