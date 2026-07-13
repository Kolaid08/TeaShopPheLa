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
  IsFeatured?: boolean;
  SalesCount?: number;
  AverageRating?: number;
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
  OrderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  ShippingAddress?: string;
  ProvinceID?: number;
  DistrictID?: number;
  WardCode?: string;
  ReceiverName?: string;
  ReceiverPhone?: string;
  TotalPrice: number;
  ShippingFee?: number;
  DiscountAmount?: number;
  OrderNote?: string;
  PaymentMethod?: string;
  PaymentStatus?: string;
  RefundStatus?: string;
  RefundReason?: string;
  RefundBankCode?: string;
  RefundAccountNumber?: string;
  RefundAccountName?: string;
  Customer?: Customer;
  ShopTable?: ShopTable;
  OrderDetails?: OrderDetail[];
  Reviews?: { DrinkID: number; Rating: number }[];
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
      DrinkImageURL: 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: true,
      SalesCount: 1540,
      AverageRating: 4.8,
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 2,
      DrinkName: 'Trà sữa Oolong Nhài',
      DrinkDescription: 'Hương nhài thoang thoảng với trà oolong',
      DrinkImageURL: 'https://images.unsplash.com/photo-1517701550927-30cfcb64d39f?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: false,
      SalesCount: 890,
      AverageRating: 4.5,
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 3,
      DrinkName: 'Cà phê Cốt dừa Phêla',
      DrinkDescription: 'Cà phê Espresso cùng cốt dừa sánh mịn',
      DrinkImageURL: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: true,
      SalesCount: 1200,
      AverageRating: 4.9,
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 4,
      DrinkName: 'Trà Ô Long trân châu',
      DrinkDescription: 'Oolong truyền thống kèm trân châu hoàng kim',
      DrinkImageURL: 'https://images.unsplash.com/photo-1622485540417-6f6ebef644e5?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: false,
      SalesCount: 500,
      AverageRating: 4.2,
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 5,
      DrinkName: 'Trà Ô Long Nhiệt Đới',
      DrinkDescription: 'Sự kết hợp hoàn hảo giữa trà ô long thượng hạng và trái cây nhiệt đới tươi mát',
      DrinkImageURL: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: true,
      SalesCount: 650,
      AverageRating: 4.6,
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 6,
      DrinkName: 'Cà Phê Trứng Phêla',
      DrinkDescription: 'Sự hòa quyện giữa vị đắng của espresso béo ngậy cùng kem trứng đánh bông',
      DrinkImageURL: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: true,
      SalesCount: 950,
      AverageRating: 4.7,
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 7,
      DrinkName: 'Trà Sữa Matcha Ô Long',
      DrinkDescription: 'Bột matcha Nhật Bản nguyên chất hòa quyện cùng cốt trà sữa ô long đậm vị',
      DrinkImageURL: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: false,
      SalesCount: 420,
      AverageRating: 4.3,
      createdAt: new Date().toISOString(),
    },
    {
      DrinkID: 8,
      DrinkName: 'Cà Phê Espresso Sữa Đặc',
      DrinkDescription: 'Espresso chiết xuất đậm đặc hòa cùng sữa đặc truyền thống béo ngọt',
      DrinkImageURL: 'https://images.unsplash.com/photo-1529892485635-a4b08dc0cb1f?auto=format&fit=crop&q=80&w=400',
      DrinkStatus: 'ACTIVE',
      IsFeatured: false,
      SalesCount: 780,
      AverageRating: 4.4,
      createdAt: new Date().toISOString(),
    }
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
      const res = await fetch(`${API_BASE}/customers/public/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, fullName }),
      });
      const payload = await res.json();
      
      if (!res.ok || !payload.data) {
        throw new Error(payload.message || 'Login failed');
      }
      
      const cust = payload.data.customer || payload.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('phela_customer_token', payload.data.token || 'real_cust_token_' + Date.now());
        localStorage.setItem('phela_customer_user', JSON.stringify(cust));
        localStorage.removeItem('chat_session_id'); // Xóa phiên chat cũ
        window.dispatchEvent(new Event('customer_auth_changed'));
      }
      return cust;
    } catch (error) {
      console.error('Customer login error:', error);
      throw error;
    }
  },

  customerLogout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phela_customer_token');
      localStorage.removeItem('phela_customer_user');
      localStorage.removeItem('chat_session_id'); // Xóa phiên chat cũ
      window.dispatchEvent(new Event('customer_auth_changed'));
    }
  },

  getCurrentCustomer: () => getSessionCustomer(),

  syncCustomerProfile: async (phoneNumber: string) => {
    try {
      const res = await fetch(`${API_BASE}/customers/public/profile/${phoneNumber}`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok && payload.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('phela_customer_user', JSON.stringify(payload.data));
          window.dispatchEvent(new Event('customer_auth_changed'));
        }
        return payload.data;
      }
    } catch {
      // fallback
    }
    return getSessionCustomer();
  },

  // DRINKS CATALOG
  syncCart: async (Items: any[], customerId?: number, sessionId?: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/carts/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Items, CustomerID: customerId, SessionID: sessionId })
      });
      return res.json();
    } catch (error) {
      return { success: true };
    }
  },

  getDrinks: async (): Promise<Drink[]> => {
    try {
      const res = await fetch(`${API_BASE}/drinks?limit=100`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.drinks;
    }
  },

  getSizes: async (): Promise<Size[]> => {
    try {
      const res = await fetch(`${API_BASE}/sizes`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.sizes;
    }
  },

  getDrinkSizes: async (): Promise<DrinkSize[]> => {
    try {
      const res = await fetch(`${API_BASE}/drink-sizes?limit=1000`, { cache: 'no-store' });
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
      const res = await fetch(`${API_BASE}/shop-tables`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      return db.tables;
    }
  },

  getComboSuggestions: async (drinkSizeIds: number[]): Promise<any[]> => {
    if (drinkSizeIds.length === 0) return [];
    try {
      const res = await fetch(`${API_BASE}/orders/customer-combos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drinkSizeIds }),
      });
      const payload = await res.json();
      if (res.ok) return payload.data;
      return [];
    } catch {
      return [];
    }
  },

  getActivePromotions: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/promotions/active`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok) return payload.data.filter((p: any) => p.IsActive);
      return [];
    } catch {
      return [];
    }
  },

  // ORDER SUBMISSIONS & HISTORY
  getCustomerOrders: async (): Promise<Order[]> => {
    const cust = getSessionCustomer();
    try {
      const token = localStorage.getItem('phela_customer_token');
      const res = await fetch(`${API_BASE}/orders/customer-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store'
      });
      const payload = await res.json();
      if (res.ok) return payload.data;
      
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('phela_customer_token');
          localStorage.removeItem('phela_customer_user');
          window.location.href = '/login';
        }
        throw new Error('Phiên đăng nhập hết hạn');
      }
      throw new Error(payload.message || 'Error');
    } catch (e: any) {
      if (e.message === 'Phiên đăng nhập hết hạn') throw e;
      
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
    Items: { DrinkSizeID: number; Quantity: number; UnitPrice: number; Sugar?: string; Ice?: string; Toppings?: string }[];
    TotalPrice: number;
    ShopTableID?: number;
    OrderNote?: string;
    OrderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    ShippingAddress?: string;
    ProvinceID?: number;
    DistrictID?: number;
    WardCode?: string;
    ReceiverName?: string;
    ReceiverPhone?: string;
    VoucherCode?: string;
  }): Promise<Order> => {
    const cust = getSessionCustomer();
    
    try {
      const token = localStorage.getItem('phela_customer_token');
      const res = await fetch(`${API_BASE}/orders/customer-place`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          CustomerID: cust?.CustomerID || 1,
          CustomerName: cust?.CustomerName || 'Hội viên Phêla',
          CustomerPhoneNumber: cust?.PhoneNumber || '0900000000',
          ShopTableID: data.ShopTableID || undefined,
          OrderNote: data.OrderNote || undefined,
          OrderType: data.OrderType,
          ShippingAddress: data.ShippingAddress,
          ProvinceID: data.ProvinceID,
          DistrictID: data.DistrictID,
          WardCode: data.WardCode,
          ReceiverName: data.ReceiverName,
          ReceiverPhone: data.ReceiverPhone,
          VoucherCode: data.VoucherCode,
          TotalPrice: data.TotalPrice,
          DeliveryType: data.DeliveryType,
          RecipientName: data.RecipientName,
          RecipientPhone: data.RecipientPhone,
          DeliveryAddress: data.DeliveryAddress,
          ProvinceID: data.ProvinceID,
          DistrictID: data.DistrictID,
          WardCode: data.WardCode,
          Items: data.Items.map((item) => ({
            DrinkSizeID: item.DrinkSizeID,
            Quantity: item.Quantity,
            UnitPrice: item.UnitPrice,
            Sugar: item.Sugar,
            Ice: item.Ice,
            Toppings: item.Toppings,
          })),
        }),
      });
      const payload = await res.json();
      if (res.ok) return payload.data;
      console.error('Backend Error Payload:', payload);
      throw new Error(payload.message || 'Error');
    } catch {
      const newO: Order = {
        OrderID: db.orders.length + 1,
        CustomerID: cust?.CustomerID || 1,
        ShopTableID: data.ShopTableID || undefined,
        CreatedTime: new Date().toISOString(),
        OrderStatus: 'PENDING',
        TotalPrice: data.TotalPrice,
        OrderNote: data.OrderNote || undefined,
        OrderType: data.OrderType || (data.ShopTableID ? 'DINE_IN' : 'TAKEAWAY'),
        ShippingAddress: data.ShippingAddress || undefined,
        ProvinceID: data.ProvinceID || undefined,
        DistrictID: data.DistrictID || undefined,
        WardCode: data.WardCode || undefined,
        ReceiverName: data.ReceiverName || undefined,
        ReceiverPhone: data.ReceiverPhone || undefined,
        OrderDetails: data.Items.map((item) => ({
          OrderID: db.orders.length + 1,
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          UnitPrice: item.UnitPrice,
          Sugar: item.Sugar || '100%',
          Ice: item.Ice || '100%',
          Toppings: item.Toppings || '',
        })),
      };

      db.orders.push(newO);
      saveLocalState();
      return newO;
    }
  },

  createPayOSLink: async (orderId: number, amount: number): Promise<{ checkoutUrl: string; qrCode: string; accountNumber?: string; description?: string; bin?: string; amount?: number; }> => {
    try {
      const res = await fetch(`${API_BASE}/payment/payos/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount }),
      });
      const payload = await res.json();
      if (res.ok && payload.success) return payload.data;
      throw new Error(payload.message || 'Lỗi kết nối PayOS');
    } catch (e) {
      // Mock fallback
      return {
        checkoutUrl: `/payment/mock/${orderId}`,
        qrCode: `https://img.vietqr.io/image/mbbank-7414012005-compact2.png?amount=${amount}&addInfo=PHELA${orderId}&accountName=NGUYEN%20VAN%20KHOA`,
        accountNumber: '7414012005',
        bin: 'MBBank',
        description: `PHELA${orderId}`,
        amount: amount,
      };
    }
  },

  getOrderStatus: async (orderId: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/orders/customer-status/${orderId}`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok) return payload.data;
      throw new Error();
    } catch {
      // Local fallback
      return db.orders.find(o => o.OrderID === orderId);
    }
  },

  cancelCustomerOrder: async (orderId: number, refundInfo?: { RefundBankCode: string, RefundAccountNumber: string, RefundAccountName: string }): Promise<any> => {
    try {
      const token = localStorage.getItem('phela_customer_token');
      const res = await fetch(`${API_BASE}/orders/customer-cancel/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: refundInfo ? JSON.stringify(refundInfo) : JSON.stringify({}),
      });
      const payload = await res.json();
      if (res.ok && payload.success) return payload.data;
      throw new Error(payload.message || 'Lỗi hủy đơn hàng');
    } catch (e: any) {
      // Local fallback
      const idx = db.orders.findIndex(o => o.OrderID === orderId);
      const order = db.orders[idx];
      if (order && order.OrderStatus === 'PENDING') {
        order.OrderStatus = 'CANCELLED';
        saveLocalState();
        return order;
      }
      throw new Error(e?.message || 'Lỗi kết nối tới máy chủ');
    }
  },

  submitReview: async (data: { CustomerID: number; DrinkID: number; OrderID: number; Rating: number; Comment: string }): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (res.ok && payload.success) return payload.data;
      throw new Error(payload.message || 'Lỗi gửi đánh giá');
    } catch (e: any) {
      throw new Error(e.message || 'Lỗi khi thanh toán đơn hàng');
    }
  },

  getProvinces: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/shipping/provinces`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      return [];
    } catch {
      return [];
    }
  },
  getDistricts: async (provinceId: number): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/shipping/districts/${provinceId}`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      return [];
    } catch {
      return [];
    }
  },
  getWards: async (districtId: number): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/shipping/wards/${districtId}`);
      const payload = await res.json();
      if (res.ok) return payload.data;
      return [];
    } catch {
      return [];
    }
  },
  calculateFee: async (data: { to_district_id: number; to_ward_code: string; items: { DrinkSizeID: number; Quantity: number; }[] }): Promise<{ fee: number, totalWeight: number }> => {
    try {
      const res = await fetch(`${API_BASE}/shipping/calculate-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const payload = await res.json();
      if (res.ok) return payload.data;
      return { fee: 0, totalWeight: 0 };
    } catch {
      return { fee: 0, totalWeight: 0 };
    }
  },

  getFrequentOrders: async (customerId: number): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE}/orders/customer-frequent/${customerId}`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok && payload.success) return payload.data;
      return [];
    } catch (e: any) {
      // Local fallback: We can implement local grouping if we want, but for now just return empty array
      return [];
    }
  },

  checkVoucher: async (code: string, customerId?: number, targetProductId?: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/vouchers/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Code: code, CustomerID: customerId, TargetProductID: targetProductId }),
      });
      const payload = await res.json();
      if (res.ok && payload.success) return payload.data;
      throw new Error(payload.message || 'Mã giảm giá không hợp lệ');
    } catch (e: any) {
      throw new Error(e.message || 'Lỗi kết nối kiểm tra mã giảm giá');
    }
  },

  getChatboxCombos: async (customerId?: number): Promise<any[]> => {
    try {
      const url = customerId 
        ? `${API_BASE}/promotions/chatbox-combos?customerId=${customerId}`
        : `${API_BASE}/promotions/chatbox-combos`;
      const res = await fetch(url, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok && payload.success) return payload.data;
      return [];
    } catch (e: any) {
      return [];
    }
  },
};
