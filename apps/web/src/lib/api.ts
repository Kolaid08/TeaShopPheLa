/**
 * strongly-typed API fetch client wrapper for Phêla Shop Management System.
 * Engages dynamic Dual Mode: attempts real HTTP API queries, falling back seamlessly
 * to a full-featured client-side Local Storage Database mock in case the backend is offline.
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

export interface Recipe {
  RecipeID: number;
  DrinkID: number;
  Drink?: { DrinkName: string };
  RecipeDetails?: RecipeDetail[];
}

export interface RecipeDetail {
  RecipeID: number;
  IngredientID: number;
  Quantity: number;
  Ingredient?: { IngredientName: string; Unit?: { UnitName: string } };
}

export interface Supplier {
  SupplierID: number;
  SupplierName: string;
  SupplierEmail: string;
  Street?: string;
  AddressNumber?: string;
  City?: string;
  District?: string;
  Ward?: string;
  SupplierPhones?: { PhoneNumber: string }[];
}

export interface IngredientReceipt {
  IngredientReceiptID: number;
  SupplierID: number;
  ReceivedDate: string;
  IngredientReceiptStatus: 'PENDING' | 'CONFIRMED';
  Supplier?: { SupplierName: string };
  IngredientReceiptDetails?: IngredientReceiptDetail[];
}

export interface IngredientReceiptDetail {
  IngredientReceiptID: number;
  IngredientID: number;
  Quantity: number;
  CostPrice: number;
  Ingredient?: { IngredientName: string };
}

export interface MembershipLevel {
  LevelID: number;
  LevelName: string;
  DiscountRate: number;
  RequiredMoney: number;
}

export interface Customer {
  CustomerID: number;
  CustomerName: string;
  Email?: string;
  PhoneNumber: string;
  TotalMoneySpending: number;
  LevelID: number;
  MemberShipLevel?: MembershipLevel;
}

export interface ShopTable {
  ShopTableID: number;
  ShopTableNumber: number;
}

export interface Order {
  OrderID: number;
  CustomerID?: number;
  ShopTableID?: number;
  EmployeeID: number;
  CreatedTime: string;
  OrderStatus: 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
  TotalPrice: number;
  OrderNote?: string;
  Customer?: { CustomerName: string; PhoneNumber: string };
  ShopTable?: { ShopTableNumber: number };
  Employee?: { FullName: string };
  OrderDetails?: OrderDetail[];
}

export interface OrderDetail {
  OrderID: number;
  DrinkSizeID: number;
  Quantity: number;
  UnitPrice: number;
  DrinkSize?: {
    Drink?: { DrinkName: string };
    Size?: { SizeName: string };
  };
}

export interface Employee {
  EmployeeID: number;
  FullName: string;
  PhoneNumber: string;
  Email: string;
  Birth: string;
  Sex: string;
  PINCode: string;
  RoleID: number;
  Role?: { RoleName: string };
}

export interface EmployeeRole {
  RoleID: number;
  RoleName: string;
  Description?: string;
  DefaultBaseSalary: number;
}

export interface Salary {
  SalaryID: number;
  EmployeeID: number;
  Month: number;
  Year: number;
  BaseSalary: number;
  TotalHours: number;
  Bonus: number;
  Deduction: number;
  RealSalary: number;
  PaidDate?: string;
  Employee?: { FullName: string; Role?: { RoleName: string } };
}

export interface Shift {
  ShiftID: number;
  ShiftName: string;
  StartTime: string;
  EndTime: string;
  Note?: string;
}

export interface ShiftLog {
  ShiftLogID: number;
  EmployeeID: number;
  ShiftID: number;
  WorkDate: string;
  CheckInTime?: string;
  CheckOutTime?: string;
  ShiftStatus: 'PRESENT' | 'ABSENT' | 'LATE';
  Employee?: { FullName: string };
  Shift?: { ShiftName: string; StartTime: string; EndTime: string };
}

// In-Memory Fallback Local Database
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

  units: Unit[] = [
    { UnitID: 1, UnitName: 'Gram' },
    { UnitID: 2, UnitName: 'Milliliter' },
    { UnitID: 3, UnitName: 'Hộp' },
  ];

  ingredients: Ingredient[] = [
    { IngredientID: 1, IngredientName: 'Trà Ô Long khô', QuantityStock: 5000, UnitID: 1 },
    { IngredientID: 2, IngredientName: 'Bột sữa béo', QuantityStock: 8000, UnitID: 1 },
    { IngredientID: 3, IngredientName: 'Sữa đặc', QuantityStock: 2500, UnitID: 2 },
    { IngredientID: 4, IngredientName: 'Hạt trân châu khô', QuantityStock: 3.5, UnitID: 1 }, // low stock
  ];

  recipes: Recipe[] = [
    {
      RecipeID: 1,
      DrinkID: 1,
      RecipeDetails: [
        { RecipeID: 1, IngredientID: 1, Quantity: 15 },
        { RecipeID: 1, IngredientID: 2, Quantity: 30 },
      ],
    },
  ];

  suppliers: Supplier[] = [
    {
      SupplierID: 1,
      SupplierName: 'Nông sản Đà Lạt',
      SupplierEmail: 'dalat@nongsan.vn',
      City: 'Đà Lạt',
      SupplierPhones: [{ PhoneNumber: '0912345678' }],
    },
    {
      SupplierID: 2,
      SupplierName: 'Trà sạch Oolong Hà Giang',
      SupplierEmail: 'tea@hagiang.vn',
      City: 'Hà Giang',
      SupplierPhones: [{ PhoneNumber: '0988776655' }],
    },
  ];

  receipts: IngredientReceipt[] = [];

  levels: MembershipLevel[] = [
    { LevelID: 1, LevelName: 'Đồng (Bronze)', DiscountRate: 0, RequiredMoney: 0 },
    { LevelID: 2, LevelName: 'Bạc (Silver)', DiscountRate: 5, RequiredMoney: 1000000 },
    { LevelID: 3, LevelName: 'Vàng (Gold)', DiscountRate: 10, RequiredMoney: 3000000 },
    { LevelID: 4, LevelName: 'Kim cương (Diamond)', DiscountRate: 15, RequiredMoney: 10000000 },
  ];

  customers: Customer[] = [
    {
      CustomerID: 1,
      CustomerName: 'Nguyễn Văn A',
      Email: 'ana@gmail.com',
      PhoneNumber: '0901122334',
      TotalMoneySpending: 1250000,
      LevelID: 2,
    },
    {
      CustomerID: 2,
      CustomerName: 'Trần Thị B',
      Email: 'btran@gmail.com',
      PhoneNumber: '0909988776',
      TotalMoneySpending: 3200000,
      LevelID: 3,
    },
  ];

  tables: ShopTable[] = [
    { ShopTableID: 1, ShopTableNumber: 1 },
    { ShopTableID: 2, ShopTableNumber: 2 },
    { ShopTableID: 3, ShopTableNumber: 3 },
    { ShopTableID: 4, ShopTableNumber: 4 },
  ];

  orders: Order[] = [];

  roles: EmployeeRole[] = [
    {
      RoleID: 1,
      RoleName: 'ADMIN',
      Description: 'Quản trị viên hệ thống',
      DefaultBaseSalary: 12000000,
    },
    { RoleID: 2, RoleName: 'MANAGER', Description: 'Quản lý cửa hàng', DefaultBaseSalary: 8000000 },
    { RoleID: 3, RoleName: 'STAFF', Description: 'Barista / Thu ngân', DefaultBaseSalary: 5000000 },
  ];

  employees: Employee[] = [
    {
      EmployeeID: 1,
      FullName: 'Nguyễn Hoàng Giang',
      PhoneNumber: '0977112233',
      Email: 'giang@phela.vn',
      Birth: '1995-05-12',
      Sex: 'MALE',
      PINCode: '1234',
      RoleID: 1,
    },
    {
      EmployeeID: 2,
      FullName: 'Phạm Thanh Thảo',
      PhoneNumber: '0988223344',
      Email: 'thao@phela.vn',
      Birth: '1998-08-20',
      Sex: 'FEMALE',
      PINCode: '5678',
      RoleID: 3,
    },
  ];

  salaries: Salary[] = [];

  shifts: Shift[] = [
    { ShiftID: 1, ShiftName: 'Ca sáng (S)', StartTime: '08:00', EndTime: '12:00', Note: 'Ca 1' },
    { ShiftID: 2, ShiftName: 'Ca chiều (C)', StartTime: '12:00', EndTime: '17:00', Note: 'Ca 2' },
    { ShiftID: 3, ShiftName: 'Ca tối (T)', StartTime: '17:00', EndTime: '22:30', Note: 'Ca 3' },
  ];

  shiftLogs: ShiftLog[] = [];
}

const db = new LocalDatabase();

// Token Session Storage helpers for offline support
const getSessionUser = (): any => {
  if (typeof window === 'undefined')
    return { EmployeeID: 1, FullName: 'Nguyễn Hoàng Giang', Role: 'ADMIN' };
  const user = localStorage.getItem('phela_user');
  return user ? JSON.parse(user) : { EmployeeID: 1, FullName: 'Nguyễn Hoàng Giang', Role: 'ADMIN' };
};

// Strongly-typed api handlers
export const api = {
  // Authentication
  login: async (PINCode: string, password?: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ PINCode, password: password || 'password123' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      if (typeof window !== 'undefined') {
        localStorage.setItem('phela_token', data.data.accessToken);
        localStorage.setItem('phela_user', JSON.stringify(data.data.employee));
      }
      return data.data;
    } catch {
      // Offline fallback login check
      const emp = db.employees.find((e) => e.PINCode === PINCode);
      if (!emp) throw new Error('Mã PIN không đúng hoặc Barista chưa đăng ký.');
      const data = {
        accessToken: 'mock_token_' + Date.now(),
        employee: {
          EmployeeID: emp.EmployeeID,
          FullName: emp.FullName,
          Role: emp.RoleID === 1 ? 'ADMIN' : emp.RoleID === 2 ? 'MANAGER' : 'STAFF',
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('phela_token', data.accessToken);
        localStorage.setItem('phela_user', JSON.stringify(data.employee));
      }
      return data;
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phela_token');
      localStorage.removeItem('phela_user');
    }
  },

  getCurrentUser: () => getSessionUser(),

  // Generic request handler
  request: async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('phela_token') : '';
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.message || 'API query failed.');
    return payload.data;
  },

  // DRINKS
  getDrinks: async (): Promise<Drink[]> => {
    try {
      return await api.request('/drinks');
    } catch {
      return db.drinks;
    }
  },
  createDrink: async (data: any): Promise<Drink> => {
    try {
      return await api.request('/drinks', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newD = { DrinkID: db.drinks.length + 1, ...data, createdAt: new Date().toISOString() };
      db.drinks.push(newD);
      return newD;
    }
  },
  updateDrink: async (id: number, data: any): Promise<Drink> => {
    try {
      return await api.request(`/drinks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.drinks.findIndex((d) => d.DrinkID === id);
      if (idx === -1) throw new Error('Drink not found');
      db.drinks[idx] = { ...db.drinks[idx], ...data } as Drink;
      return db.drinks[idx]!;
    }
  },
  deleteDrink: async (id: number): Promise<void> => {
    try {
      await api.request(`/drinks/${id}`, { method: 'DELETE' });
    } catch {
      db.drinks = db.drinks.filter((d) => d.DrinkID !== id);
    }
  },

  // SIZES
  getSizes: async (): Promise<Size[]> => {
    try {
      return await api.request('/sizes');
    } catch {
      return db.sizes;
    }
  },
  createSize: async (data: any): Promise<Size> => {
    try {
      return await api.request('/sizes', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newS = { SizeID: db.sizes.length + 1, ...data };
      db.sizes.push(newS);
      return newS;
    }
  },
  updateSize: async (id: number, data: any): Promise<Size> => {
    try {
      return await api.request(`/sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.sizes.findIndex((s) => s.SizeID === id);
      if (idx === -1) throw new Error('Size not found');
      db.sizes[idx] = { ...db.sizes[idx], ...data } as Size;
      return db.sizes[idx]!;
    }
  },
  deleteSize: async (id: number): Promise<void> => {
    try {
      await api.request(`/sizes/${id}`, { method: 'DELETE' });
    } catch {
      db.sizes = db.sizes.filter((s) => s.SizeID !== id);
    }
  },

  // DRINK SIZES
  getDrinkSizes: async (): Promise<DrinkSize[]> => {
    try {
      return await api.request('/drink-sizes');
    } catch {
      return db.drinkSizes.map((ds) => ({
        ...ds,
        Drink: db.drinks.find((d) => d.DrinkID === ds.DrinkID),
        Size: db.sizes.find((s) => s.SizeID === ds.SizeID),
      }));
    }
  },
  createDrinkSize: async (data: any): Promise<DrinkSize> => {
    try {
      return await api.request('/drink-sizes', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newDS = {
        DrinkSizeID: db.drinkSizes.length + 1,
        ...data,
        DrinkSizeStatus: 'AVAILABLE',
      };
      db.drinkSizes.push(newDS);
      return newDS;
    }
  },
  updateDrinkSize: async (id: number, data: any): Promise<DrinkSize> => {
    try {
      return await api.request(`/drink-sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.drinkSizes.findIndex((ds) => ds.DrinkSizeID === id);
      if (idx === -1) throw new Error('Not found');
      db.drinkSizes[idx] = { ...db.drinkSizes[idx], ...data } as DrinkSize;
      return db.drinkSizes[idx]!;
    }
  },
  deleteDrinkSize: async (id: number): Promise<void> => {
    try {
      await api.request(`/drink-sizes/${id}`, { method: 'DELETE' });
    } catch {
      db.drinkSizes = db.drinkSizes.filter((ds) => ds.DrinkSizeID !== id);
    }
  },

  // INGREDIENTS
  getIngredients: async (): Promise<Ingredient[]> => {
    try {
      return await api.request('/ingredients');
    } catch {
      return db.ingredients.map((ing) => ({
        ...ing,
        Unit: db.units.find((u) => u.UnitID === ing.UnitID),
      }));
    }
  },
  getLowStockIngredients: async (threshold = 10): Promise<Ingredient[]> => {
    try {
      return await api.request(`/ingredients/low-stock?threshold=${threshold}`);
    } catch {
      return db.ingredients
        .filter((ing) => ing.QuantityStock < threshold)
        .map((ing) => ({
          ...ing,
          Unit: db.units.find((u) => u.UnitID === ing.UnitID),
        }));
    }
  },
  createIngredient: async (data: any): Promise<Ingredient> => {
    try {
      return await api.request('/ingredients', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newI = { IngredientID: db.ingredients.length + 1, ...data };
      db.ingredients.push(newI);
      return newI;
    }
  },
  updateIngredient: async (id: number, data: any): Promise<Ingredient> => {
    try {
      return await api.request(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.ingredients.findIndex((ing) => ing.IngredientID === id);
      if (idx === -1) throw new Error('Ingredient not found');
      db.ingredients[idx] = { ...db.ingredients[idx], ...data } as Ingredient;
      return db.ingredients[idx]!;
    }
  },
  deleteIngredient: async (id: number): Promise<void> => {
    try {
      await api.request(`/ingredients/${id}`, { method: 'DELETE' });
    } catch {
      db.ingredients = db.ingredients.filter((ing) => ing.IngredientID !== id);
    }
  },

  // UNITS
  getUnits: async (): Promise<Unit[]> => {
    try {
      return await api.request('/units');
    } catch {
      return db.units;
    }
  },
  createUnit: async (data: any): Promise<Unit> => {
    try {
      return await api.request('/units', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newU = { UnitID: db.units.length + 1, ...data };
      db.units.push(newU);
      return newU;
    }
  },
  updateUnit: async (id: number, data: any): Promise<Unit> => {
    try {
      return await api.request(`/units/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.units.findIndex((u) => u.UnitID === id);
      if (idx === -1) throw new Error('Unit not found');
      db.units[idx] = { ...db.units[idx], ...data } as Unit;
      return db.units[idx]!;
    }
  },
  deleteUnit: async (id: number): Promise<void> => {
    try {
      await api.request(`/units/${id}`, { method: 'DELETE' });
    } catch {
      db.units = db.units.filter((u) => u.UnitID !== id);
    }
  },

  // RECIPES
  getRecipes: async (): Promise<Recipe[]> => {
    try {
      return await api.request('/recipes');
    } catch {
      return db.recipes.map((r) => ({
        ...r,
        Drink: db.drinks.find((d) => d.DrinkID === r.DrinkID),
        RecipeDetails: r.RecipeDetails?.map((rd) => ({
          ...rd,
          Ingredient: db.ingredients.find((ing) => ing.IngredientID === rd.IngredientID),
        })),
      }));
    }
  },
  createRecipe: async (data: any): Promise<Recipe> => {
    try {
      return await api.request('/recipes', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newR = {
        RecipeID: db.recipes.length + 1,
        DrinkID: data.DrinkID,
        RecipeDetails: data.Ingredients,
      };
      db.recipes.push(newR);
      return newR;
    }
  },
  updateRecipe: async (id: number, data: any): Promise<Recipe> => {
    try {
      return await api.request(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.recipes.findIndex((r) => r.RecipeID === id);
      if (idx === -1) throw new Error('Recipe not found');
      db.recipes[idx] = { RecipeID: id, DrinkID: data.DrinkID, RecipeDetails: data.Ingredients };
      return db.recipes[idx]!;
    }
  },
  deleteRecipe: async (id: number): Promise<void> => {
    try {
      await api.request(`/recipes/${id}`, { method: 'DELETE' });
    } catch {
      db.recipes = db.recipes.filter((r) => r.RecipeID !== id);
    }
  },

  // SUPPLIERS
  getSuppliers: async (): Promise<Supplier[]> => {
    try {
      return await api.request('/suppliers');
    } catch {
      return db.suppliers;
    }
  },
  createSupplier: async (data: any): Promise<Supplier> => {
    try {
      return await api.request('/suppliers', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newS = {
        SupplierID: db.suppliers.length + 1,
        ...data,
        SupplierPhones: data.PhoneNumbers.map((phone: string) => ({ PhoneNumber: phone })),
      };
      db.suppliers.push(newS);
      return newS;
    }
  },
  updateSupplier: async (id: number, data: any): Promise<Supplier> => {
    try {
      return await api.request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.suppliers.findIndex((s) => s.SupplierID === id);
      if (idx === -1) throw new Error('Supplier not found');
      db.suppliers[idx] = {
        ...db.suppliers[idx],
        ...data,
        SupplierPhones: data.PhoneNumbers.map((phone: string) => ({ PhoneNumber: phone })),
      } as Supplier;
      return db.suppliers[idx]!;
    }
  },
  deleteSupplier: async (id: number): Promise<void> => {
    try {
      await api.request(`/suppliers/${id}`, { method: 'DELETE' });
    } catch {
      db.suppliers = db.suppliers.filter((s) => s.SupplierID !== id);
    }
  },

  // INGREDIENT RECEIPTS
  getReceipts: async (): Promise<IngredientReceipt[]> => {
    try {
      return await api.request('/ingredient-receipts');
    } catch {
      return db.receipts.map((r) => ({
        ...r,
        Supplier: db.suppliers.find((s) => s.SupplierID === r.SupplierID),
        IngredientReceiptDetails: r.IngredientReceiptDetails?.map((rd) => ({
          ...rd,
          Ingredient: db.ingredients.find((ing) => ing.IngredientID === rd.IngredientID),
        })),
      }));
    }
  },
  createReceipt: async (data: any): Promise<IngredientReceipt> => {
    try {
      return await api.request('/ingredient-receipts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const newRec = {
        IngredientReceiptID: db.receipts.length + 1,
        SupplierID: data.SupplierID,
        ReceivedDate: data.ReceivedDate,
        IngredientReceiptStatus: 'PENDING' as const,
        IngredientReceiptDetails: data.Ingredients,
      };
      db.receipts.push(newRec);
      return newRec;
    }
  },
  confirmReceipt: async (id: number): Promise<IngredientReceipt> => {
    try {
      return await api.request(`/ingredient-receipts/${id}/confirm`, { method: 'PATCH' });
    } catch {
      const idx = db.receipts.findIndex((r) => r.IngredientReceiptID === id);
      if (idx === -1) throw new Error('Receipt not found');
      db.receipts[idx]!.IngredientReceiptStatus = 'CONFIRMED';

      // increment stock
      db.receipts[idx]!.IngredientReceiptDetails?.forEach((item) => {
        const ing = db.ingredients.find((ing) => ing.IngredientID === item.IngredientID);
        if (ing) ing.QuantityStock += item.Quantity;
      });
      return db.receipts[idx]!;
    }
  },

  // CUSTOMERS
  getCustomers: async (): Promise<Customer[]> => {
    try {
      return await api.request('/customers');
    } catch {
      return db.customers.map((c) => ({
        ...c,
        MemberShipLevel: db.levels.find((l) => l.LevelID === c.LevelID),
      }));
    }
  },
  getMembershipLevels: async (): Promise<MembershipLevel[]> => {
    return db.levels;
  },
  createCustomer: async (data: any): Promise<Customer> => {
    try {
      return await api.request('/customers', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newC = {
        CustomerID: db.customers.length + 1,
        ...data,
        TotalMoneySpending: data.TotalMoneySpending || 0,
        LevelID: 1,
      };
      db.customers.push(newC);
      return newC;
    }
  },
  updateCustomer: async (id: number, data: any): Promise<Customer> => {
    try {
      return await api.request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.customers.findIndex((c) => c.CustomerID === id);
      if (idx === -1) throw new Error('Customer not found');
      db.customers[idx] = { ...db.customers[idx], ...data } as Customer;
      return db.customers[idx]!;
    }
  },
  deleteCustomer: async (id: number): Promise<void> => {
    try {
      await api.request(`/customers/${id}`, { method: 'DELETE' });
    } catch {
      db.customers = db.customers.filter((c) => c.CustomerID !== id);
    }
  },

  // TABLES
  getTables: async (): Promise<ShopTable[]> => {
    try {
      return await api.request('/shop-tables');
    } catch {
      return db.tables;
    }
  },
  createTable: async (data: any): Promise<ShopTable> => {
    try {
      return await api.request('/shop-tables', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newT = { ShopTableID: db.tables.length + 1, ...data };
      db.tables.push(newT);
      return newT;
    }
  },
  deleteTable: async (id: number): Promise<void> => {
    try {
      await api.request(`/shop-tables/${id}`, { method: 'DELETE' });
    } catch {
      db.tables = db.tables.filter((t) => t.ShopTableID !== id);
    }
  },

  // ORDERS
  getOrders: async (): Promise<Order[]> => {
    try {
      return await api.request('/orders');
    } catch {
      return db.orders.map((o) => ({
        ...o,
        Customer: db.customers.find((c) => c.CustomerID === o.CustomerID),
        ShopTable: db.tables.find((t) => t.ShopTableID === o.ShopTableID),
        Employee: db.employees.find((e) => e.EmployeeID === o.EmployeeID),
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
      }));
    }
  },
  createOrder: async (data: any): Promise<Order> => {
    try {
      return await api.request('/orders', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const user = getSessionUser();
      const newO: Order = {
        OrderID: db.orders.length + 1,
        CustomerID: data.CustomerID || undefined,
        ShopTableID: data.ShopTableID || undefined,
        EmployeeID: user.EmployeeID,
        CreatedTime: new Date().toISOString(),
        OrderStatus: 'PENDING',
        TotalPrice: data.TotalPrice || 0,
        OrderNote: data.OrderNote || undefined,
        OrderDetails: data.Items.map((item: any) => ({
          OrderID: db.orders.length + 1,
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          UnitPrice: item.UnitPrice || 50000,
        })),
      };
      db.orders.push(newO);
      return newO;
    }
  },
  updateOrderStatus: async (id: number, status: string): Promise<Order> => {
    try {
      return await api.request(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ OrderStatus: status }),
      });
    } catch {
      const idx = db.orders.findIndex((o) => o.OrderID === id);
      if (idx === -1) throw new Error('Order not found');
      db.orders[idx]!.OrderStatus = status as any;

      // level progression upgrade
      if (status === 'COMPLETED' && db.orders[idx]?.CustomerID) {
        const custIdx = db.customers.findIndex((c) => c.CustomerID === db.orders[idx]?.CustomerID);
        if (custIdx !== -1) {
          db.customers[custIdx]!.TotalMoneySpending += db.orders[idx]!.TotalPrice;

          // trigger level check
          const spend = db.customers[custIdx]!.TotalMoneySpending;
          const qual = db.levels
            .filter((l) => l.RequiredMoney <= spend)
            .sort((a, b) => b.RequiredMoney - a.RequiredMoney);
          if (qual[0]) db.customers[custIdx]!.LevelID = qual[0].LevelID;
        }
      }
      return db.orders[idx]!;
    }
  },

  // EMPLOYEES
  getEmployees: async (): Promise<Employee[]> => {
    try {
      return await api.request('/employees');
    } catch {
      return db.employees.map((e) => ({
        ...e,
        Role: db.roles.find((r) => r.RoleID === e.RoleID),
      }));
    }
  },
  createEmployee: async (data: any): Promise<Employee> => {
    try {
      return await api.request('/employees', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newE = { EmployeeID: db.employees.length + 1, ...data };
      db.employees.push(newE);
      return newE;
    }
  },
  updateEmployee: async (id: number, data: any): Promise<Employee> => {
    try {
      return await api.request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.employees.findIndex((e) => e.EmployeeID === id);
      if (idx === -1) throw new Error('Employee not found');
      db.employees[idx] = { ...db.employees[idx], ...data } as Employee;
      return db.employees[idx]!;
    }
  },
  deleteEmployee: async (id: number): Promise<void> => {
    try {
      await api.request(`/employees/${id}`, { method: 'DELETE' });
    } catch {
      db.employees = db.employees.filter((e) => e.EmployeeID !== id);
    }
  },

  // ROLES
  getRoles: async (): Promise<EmployeeRole[]> => {
    try {
      return await api.request('/roles');
    } catch {
      return db.roles;
    }
  },
  createRole: async (data: any): Promise<EmployeeRole> => {
    try {
      return await api.request('/roles', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newR = { RoleID: db.roles.length + 1, ...data };
      db.roles.push(newR);
      return newR;
    }
  },
  updateRole: async (id: number, data: any): Promise<EmployeeRole> => {
    try {
      return await api.request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.roles.findIndex((r) => r.RoleID === id);
      if (idx === -1) throw new Error('Role not found');
      db.roles[idx] = { ...db.roles[idx], ...data } as EmployeeRole;
      return db.roles[idx]!;
    }
  },
  deleteRole: async (id: number): Promise<void> => {
    try {
      await api.request(`/roles/${id}`, { method: 'DELETE' });
    } catch {
      db.roles = db.roles.filter((r) => r.RoleID !== id);
    }
  },

  // SHIFTS
  getShifts: async (): Promise<Shift[]> => {
    try {
      return await api.request('/shifts');
    } catch {
      return db.shifts;
    }
  },
  createShift: async (data: any): Promise<Shift> => {
    try {
      return await api.request('/shifts', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const newS = { ShiftID: db.shifts.length + 1, ...data };
      db.shifts.push(newS);
      return newS;
    }
  },
  updateShift: async (id: number, data: any): Promise<Shift> => {
    try {
      return await api.request(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const idx = db.shifts.findIndex((s) => s.ShiftID === id);
      if (idx === -1) throw new Error('Shift not found');
      db.shifts[idx] = { ...db.shifts[idx], ...data } as Shift;
      return db.shifts[idx]!;
    }
  },
  deleteShift: async (id: number): Promise<void> => {
    try {
      await api.request(`/shifts/${id}`, { method: 'DELETE' });
    } catch {
      db.shifts = db.shifts.filter((s) => s.ShiftID !== id);
    }
  },

  // SHIFT LOGS (ATTENDANCE)
  getShiftLogs: async (): Promise<ShiftLog[]> => {
    try {
      return await api.request('/shift-logs');
    } catch {
      return db.shiftLogs.map((l) => ({
        ...l,
        Employee: db.employees.find((e) => e.EmployeeID === l.EmployeeID),
        Shift: db.shifts.find((s) => s.ShiftID === l.ShiftID),
      }));
    }
  },
  checkIn: async (shiftId: number): Promise<ShiftLog> => {
    try {
      return await api.request('/shift-logs/check-in', {
        method: 'POST',
        body: JSON.stringify({ ShiftID: shiftId }),
      });
    } catch {
      const user = getSessionUser();
      const today = new Date().toISOString().split('T')[0]!;
      const newLog: ShiftLog = {
        ShiftLogID: db.shiftLogs.length + 1,
        EmployeeID: user.EmployeeID,
        ShiftID: shiftId,
        WorkDate: today,
        CheckInTime: new Date().toISOString(),
        ShiftStatus: 'PRESENT',
      };
      db.shiftLogs.push(newLog);
      return newLog;
    }
  },
  checkOut: async (): Promise<ShiftLog> => {
    try {
      return await api.request('/shift-logs/check-out', { method: 'POST' });
    } catch {
      const user = getSessionUser();
      const log = db.shiftLogs.find((l) => l.EmployeeID === user.EmployeeID && !l.CheckOutTime);
      if (!log) throw new Error('Bạn chưa Check-in ngày hôm nay.');
      log.CheckOutTime = new Date().toISOString();
      return log;
    }
  },

  // SALARY
  getSalaries: async (): Promise<Salary[]> => {
    try {
      return await api.request('/salary');
    } catch {
      return db.salaries.map((s) => ({
        ...s,
        Employee: db.employees.find((e) => e.EmployeeID === s.EmployeeID),
      }));
    }
  },
  generateSalaries: async (month: number, year: number): Promise<Salary[]> => {
    try {
      return await api.request('/salary/generate', {
        method: 'POST',
        body: JSON.stringify({ Month: month, Year: year }),
      });
    } catch {
      const list: Salary[] = [];
      db.employees.forEach((emp) => {
        const role = db.roles.find((r) => r.RoleID === emp.RoleID);
        const base = role?.DefaultBaseSalary || 5000000;
        const exists = db.salaries.find(
          (s) => s.EmployeeID === emp.EmployeeID && s.Month === month && s.Year === year,
        );
        if (exists) return;

        const newSal: Salary = {
          SalaryID: db.salaries.length + 1,
          EmployeeID: emp.EmployeeID,
          Month: month,
          Year: year,
          BaseSalary: base,
          TotalHours: 160, // standard hours
          Bonus: 200000,
          Deduction: 50000,
          RealSalary: base + 200000 - 50000,
        };
        db.salaries.push(newSal);
        list.push(newSal);
      });
      return list;
    }
  },
  paySalary: async (id: number): Promise<Salary> => {
    try {
      return await api.request(`/salary/${id}/pay`, { method: 'PATCH' });
    } catch {
      const sal = db.salaries.find((s) => s.SalaryID === id);
      if (!sal) throw new Error('Salary sheet not found');
      sal.PaidDate = new Date().toISOString();
      return sal;
    }
  },

  // DASHBOARD Operational stats
  getDashboardStats: async (): Promise<any> => {
    try {
      return await api.request('/dashboard');
    } catch {
      // Return high-quality mock data curves
      const todayRev =
        db.orders
          .filter((o) => o.OrderStatus === 'COMPLETED')
          .reduce((acc, curr) => acc + curr.TotalPrice, 0) || 1285000;
      const todayOrd = db.orders.length || 18;
      const lowS = db.ingredients.filter((i) => i.QuantityStock < 10).length;
      return {
        todayRevenue: todayRev,
        todayOrdersCount: todayOrd,
        lowStockCount: lowS,
        lowStockAlerts: db.ingredients
          .filter((i) => i.QuantityStock < 10)
          .map((i) => ({ ...i, Unit: db.units.find((u) => u.UnitID === i.UnitID) })),
        bestSellers: db.drinkSizes.slice(0, 3).map((ds, i) => {
          const d = db.drinks.find((dr) => dr.DrinkID === ds.DrinkID);
          return {
            DrinkName: d?.DrinkName || 'Artisanal Tea',
            TotalSold: 28 - i * 5,
          };
        }),
        monthlyRevenueChart: [
          { month: 'Jan', revenue: 45000000 },
          { month: 'Feb', revenue: 52000000 },
          { month: 'Mar', revenue: 49000000 },
          { month: 'Apr', revenue: 61000000 },
          { month: 'May', revenue: 68000000 },
          { month: 'Jun', revenue: 75000000 },
        ],
      };
    }
  },
};
