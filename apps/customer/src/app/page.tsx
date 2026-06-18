'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Coffee,
  Search,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  LogOut,
  History,
  MapPin,
  Trash2,
  TableProperties,
  CheckCircle,
  PlusCircle,
} from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Badge,
  Dialog,
} from '@/components/ui/core';
import { api, Drink, DrinkSize, Customer, ShopTable } from '@/lib/api';
import { toast } from 'sonner';

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

interface CartItem {
  id: string; // unique item key
  DrinkSizeID: number;
  DrinkName: string;
  SizeName: string;
  UnitPrice: number;
  Quantity: number;
  Sugar: string;
  Ice: string;
  Toppings: { name: string; price: number }[];
}

export default function CustomerHome() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Data lists
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [drinkSizes, setDrinkSizes] = useState<DrinkSize[]>([]);
  const [tables, setTables] = useState<ShopTable[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'MILK_TEA' | 'COFFEE'>('ALL');
  const [sortOption, setSortOption] = useState<'NEWEST' | 'BEST_SELLING' | 'PRICE_ASC' | 'PRICE_DESC' | 'REVIEWS'>('NEWEST');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);

  // Customization Modal states
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number>(0);
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('100%');
  const [selectedToppings, setSelectedToppings] = useState<{ name: string; price: number }[]>([]);

  // Cart & Checkout states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR_CODE'>('COD');

  // Available options
  const toppingsList = [
    { name: 'Trân châu Hoàng Kim', price: 10000 },
    { name: 'Kem Phô Mai Phêla', price: 15000 },
    { name: 'Thạch Ô Long Giòn', price: 10000 },
  ];

  useEffect(() => {
    // Authenticate check
    const active = api.getCurrentCustomer();
    setCustomer(active);
    setIsLoadingUser(false);

    // Fetch lists
    const loadData = async () => {
      try {
        const [dList, dsList, tList] = await Promise.all([
          api.getDrinks(),
          api.getDrinkSizes(),
          api.getTables(),
        ]);
        setDrinks(dList.filter(d => d.DrinkStatus === 'ACTIVE'));
        setDrinkSizes(dsList);
        setTables(tList);
      } catch {}
      setIsLoadingMenu(false);
    };
    loadData();

    // Load cart from LocalStorage
    const savedCart = localStorage.getItem('phela_customer_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [router]);

  const saveCartState = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem('phela_customer_cart', JSON.stringify(updatedCart));

    let sessionId = localStorage.getItem('phela_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('phela_session_id', sessionId);
    }
    
    api.syncCart(updatedCart, customer?.CustomerID, sessionId).catch(console.error);
  };

  const handleLogout = () => {
    api.customerLogout();
    toast.success('Đã đăng xuất cổng hội viên.');
    router.push('/login');
  };

  // Open Customize Dialog
  const handleOpenCustomize = (drink: Drink) => {
    setSelectedDrink(drink);
    // Find first available size
    const availableSizes = drinkSizes.filter((ds) => ds.DrinkID === drink.DrinkID && ds.DrinkSizeStatus === 'AVAILABLE');
    if (availableSizes.length > 0 && availableSizes[0]) {
      setSelectedSizeId(availableSizes[0].DrinkSizeID);
    }
    setSugarLevel('100%');
    setIceLevel('100%');
    setSelectedToppings([]);
  };

  const toggleTopping = (topping: { name: string; price: number }) => {
    const idx = selectedToppings.findIndex((t) => t.name === topping.name);
    if (idx === -1) {
      setSelectedToppings((prev) => [...prev, topping]);
    } else {
      setSelectedToppings((prev) => prev.filter((t) => t.name !== topping.name));
    }
  };

  // Get pricing of currently customized size
  const getCurrentCustomPrice = () => {
    const sizeObj = drinkSizes.find((ds) => ds.DrinkSizeID === selectedSizeId);
    const base = Number(sizeObj?.UnitPrice || 0);
    const toppingsTotal = selectedToppings.reduce((acc, curr) => acc + curr.price, 0);
    return base + toppingsTotal;
  };

  // Add Item to Cart
  const handleAddToCart = () => {
    if (!selectedDrink || !selectedSizeId) return;

    const sizeObj = drinkSizes.find((ds) => ds.DrinkSizeID === selectedSizeId);
    if (!sizeObj) return;

    const toppingsTotal = selectedToppings.reduce((acc, curr) => acc + curr.price, 0);
    const unitPrice = Number(sizeObj.UnitPrice) + toppingsTotal;

    // Create unique key for same item customizations
    const itemKey = `${selectedSizeId}-${sugarLevel}-${iceLevel}-${selectedToppings.map(t=>t.name).sort().join(',')}`;

    const existingIdx = cart.findIndex((item) => item.id === itemKey);
    let updatedCart = [...cart];

    if (existingIdx !== -1 && updatedCart[existingIdx]) {
      updatedCart[existingIdx].Quantity += 1;
    } else {
      updatedCart.push({
        id: itemKey,
        DrinkSizeID: selectedSizeId,
        DrinkName: selectedDrink.DrinkName,
        SizeName: sizeObj.Size?.SizeName || 'M',
        UnitPrice: unitPrice,
        Quantity: 1,
        Sugar: sugarLevel,
        Ice: iceLevel,
        Toppings: selectedToppings,
      });
    }

    saveCartState(updatedCart);
    toast.success(`Đã thêm ${selectedDrink.DrinkName} vào giỏ hàng.`);
    setSelectedDrink(null);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    const updated = cart.map((item) => {
      if (item.id === id) {
        const nextQty = item.Quantity + delta;
        return { ...item, Quantity: nextQty > 0 ? nextQty : 1 };
      }
      return item;
    });
    saveCartState(updated);
  };

  const handleRemoveItem = (id: string) => {
    const updated = cart.filter((item) => item.id !== id);
    saveCartState(updated);
    toast.success('Đã xóa đồ uống khỏi giỏ hàng.');
  };

  // Cart calculations
  const getSubtotal = () => cart.reduce((acc, curr) => acc + curr.UnitPrice * curr.Quantity, 0);
  const getDiscountAmount = () => {
    const discountRate = customer?.MemberShipLevel?.DiscountRate || 0;
    return Math.floor((getSubtotal() * discountRate) / 100);
  };
  const getTotalPrice = () => getSubtotal() - getDiscountAmount();

  // Submit checkout Order
  const handlePlaceOrder = async (method: 'QR_CODE' | 'COD') => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống! Vui lòng chọn món nước.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        Items: cart.map((item) => ({
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          Sugar: item.Sugar,
          Ice: item.Ice,
          Toppings: item.Toppings && item.Toppings.length > 0 ? item.Toppings.map(t => t.name).join(', ') : undefined,
          UnitPrice: item.UnitPrice,
        })),
        TotalPrice: getTotalPrice(),
        ShopTableID: tableId > 0 ? tableId : undefined,
        OrderNote: `${deliveryAddress ? `Giao hàng: ${deliveryAddress}` : ''}${orderNote ? ` | Ghi chú: ${orderNote}` : ''}`,
      };

      const res = await api.createCustomerOrder(orderPayload);
      
      // Reset Giỏ hàng
      saveCartState([]);
      setOrderNote('');
      setDeliveryAddress('');
      setIsCheckoutOpen(false);
      
      toast.success('Đặt trà sữa thành công! Quầy lễ tân Phêla đã nhận được đơn.');
      router.push('/history');
    } catch (err: any) {
      toast.error('Lỗi gửi đơn đặt hàng.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Filter drinks lists
  const filteredDrinks = drinks.filter((d) => {
    const q = removeAccents(searchQuery.toLowerCase());
    const matchesSearch = removeAccents(d.DrinkName.toLowerCase()).includes(q) || 
      (d.DrinkDescription && removeAccents(d.DrinkDescription.toLowerCase()).includes(q));

    const isCoffee = d.DrinkName.toLowerCase().includes('cà phê') || d.DrinkName.toLowerCase().includes('espresso');
    const isMilkTea = !isCoffee;

    let matchesCategory = false;
    if (activeCategory === 'ALL') matchesCategory = true;
    else if (activeCategory === 'COFFEE') matchesCategory = isCoffee;
    else if (activeCategory === 'MILK_TEA') matchesCategory = isMilkTea;

    // Price filter
    const prices = drinkSizes.filter(ds => ds.DrinkID === d.DrinkID).map(ds => ds.UnitPrice);
    const minP = prices.length > 0 ? Math.min(...prices) : 0;
    const maxP = prices.length > 0 ? Math.max(...prices) : 0;
    
    let matchesPrice = true;
    if (minPrice && minP < parseInt(minPrice)) matchesPrice = false;
    if (maxPrice && maxP > parseInt(maxPrice)) matchesPrice = false;

    let matchesRating = true;
    if (minRating > 0) {
      if (!d.AverageRating || d.AverageRating < minRating) matchesRating = false;
    }

    return matchesSearch && matchesCategory && matchesPrice && matchesRating;
  }).sort((a, b) => {
    if (sortOption === 'BEST_SELLING') return (b.SalesCount || 0) - (a.SalesCount || 0);
    if (sortOption === 'REVIEWS') return (b.AverageRating || 0) - (a.AverageRating || 0);
    
    const aPrices = drinkSizes.filter(ds => ds.DrinkID === a.DrinkID).map(ds => ds.UnitPrice);
    const bPrices = drinkSizes.filter(ds => ds.DrinkID === b.DrinkID).map(ds => ds.UnitPrice);
    const aPrice = aPrices.length > 0 ? Math.min(...aPrices) : 0;
    const bPrice = bPrices.length > 0 ? Math.min(...bPrices) : 0;
    
    if (sortOption === 'PRICE_ASC') return aPrice - bPrice;
    if (sortOption === 'PRICE_DESC') return bPrice - aPrice;
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // NEWEST
  });

  if (isLoadingUser) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* Cổng Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Coffee className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="font-serif font-extrabold text-xl tracking-wider text-primary uppercase leading-tight">Phêla</h1>
              <span className="text-[9px] block text-muted-foreground font-semibold tracking-widest uppercase">Cửa hàng trực tuyến</span>
            </div>
          </Link>

          {/* User profile & controls */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-muted-foreground">Xin chào,</span>
              <span className="text-sm font-bold text-foreground truncate max-w-40">
                {customer ? customer.CustomerName : 'Khách vãn lai'}
              </span>
            </div>

            {customer ? (
              <>
                <Badge variant="warning" className="font-bold text-[10px]">
                  {customer.MemberShipLevel?.LevelName || 'Đồng (Bronze)'}
                </Badge>
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="rounded-xl flex items-center gap-1.5 text-xs text-primary font-bold">
                    <History className="w-4 h-4" /> Lịch sử đơn
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" size="sm" className="rounded-xl p-2 text-red-500 hover:bg-red-500/10">
                  <LogOut className="w-4.5 h-4.5" />
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm" className="rounded-xl font-bold font-serif uppercase tracking-wider text-xs">
                  Đăng nhập / Đăng ký
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main portal catalog grid */}
      <main className="flex-1 container max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 cols: Menu Catalog list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
            <div>
              <h2 className="font-serif font-black text-2xl md:text-3xl text-foreground tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Hôm nay uống gì?
              </h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-0.5">Đặt trực tuyến giao tận tay hoặc phục vụ tại quầy trong 15 phút</p>
            </div>

            {/* Category selection filters */}
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40 gap-1 text-xs font-bold self-start">
              <button 
                onClick={() => setActiveCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeCategory === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setActiveCategory('MILK_TEA')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeCategory === 'MILK_TEA' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Trà sữa
              </button>
              <button 
                onClick={() => setActiveCategory('COFFEE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeCategory === 'COFFEE' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Cà phê
              </button>
            </div>
          </div>

          {/* Search Bar input */}
          <div className="relative w-full">
            <Search className="w-4.5 h-4.5 text-muted-foreground/60 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input 
              type="text"
              placeholder="Tìm kiếm trà sữa oolong, cà phê cốt dừa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 bg-card/60 rounded-xl"
            />
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-wrap gap-3 bg-muted/30 p-3 rounded-xl border border-border/40">
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value as any)}
              className="text-xs p-2 rounded-lg border border-border bg-background"
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="BEST_SELLING">Bán chạy nhất</option>
              <option value="REVIEWS">Đánh giá cao</option>
              <option value="PRICE_ASC">Giá: Thấp đến Cao</option>
              <option value="PRICE_DESC">Giá: Cao đến Thấp</option>
            </select>
            <select 
              value={minRating} 
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="text-xs p-2 rounded-lg border border-border bg-background"
            >
              <option value={0}>Tất cả đánh giá</option>
              <option value={4}>Từ 4 sao trở lên</option>
              <option value={5}>Chỉ 5 sao</option>
            </select>
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                min="0"
                placeholder="Giá từ..." 
                value={minPrice} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val < 0) setMinPrice('0');
                  else setMinPrice(e.target.value);
                }} 
                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                className="w-24 h-8 text-xs" 
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="number" 
                min="0"
                placeholder="Đến..." 
                value={maxPrice} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val < 0) setMaxPrice('0');
                  else setMaxPrice(e.target.value);
                }} 
                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                className="w-24 h-8 text-xs" 
              />
            </div>
          </div>

          {/* Menu Catalog item cards grid */}
          {isLoadingMenu ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-40 bg-muted rounded-2xl" />
              ))}
            </div>
          ) : filteredDrinks.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Coffee className="w-12 h-12 text-muted-foreground/30" />
              <p className="font-serif font-black text-lg">Không tìm thấy món nước phù hợp</p>
              <p className="text-xs">Hãy thử đổi bộ lọc tìm kiếm sản phẩm khác bạn nhé!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredDrinks.map((drink) => {
                // Find all pricing options for display range
                const prices = drinkSizes.filter(ds => ds.DrinkID === drink.DrinkID).map(ds => ds.UnitPrice);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 45000;
                
                return (
                  <Card key={drink.DrinkID} className="p-0 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 group overflow-hidden bg-card/50">
                    <div className="h-44 w-full bg-muted relative overflow-hidden">
                      {drink.DrinkImageURL ? (
                        <img src={drink.DrinkImageURL} alt={drink.DrinkName} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Coffee className="w-8 h-8 text-muted-foreground/30" /></div>
                      )}
                      {drink.IsFeatured && <Badge variant="warning" className="absolute top-2 right-2 text-[9px] font-bold shadow-md uppercase">Nổi Bật</Badge>}
                    </div>
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div className="space-y-1.5">
                        <h3 className="font-serif font-black text-lg text-foreground group-hover:text-primary transition-colors">{drink.DrinkName}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{drink.DrinkDescription || 'Món uống đặc sản chè thô Phêla.'}</p>
                        {drink.AverageRating && drink.AverageRating > 0 ? (
                          <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
                            ⭐ {drink.AverageRating} <span className="text-muted-foreground font-medium">({drink.SalesCount || 0} đã bán)</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            ⭐ Chưa có đánh giá <span className="text-muted-foreground/70">({drink.SalesCount || 0} đã bán)</span>
                          </p>
                        )}
                      </div>

                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/30">
                      <span className="text-sm font-bold text-primary font-mono">Từ {minPrice.toLocaleString('vi-VN')} đ</span>
                      <Button 
                        onClick={() => handleOpenCustomize(drink)}
                        size="sm" 
                        className="rounded-lg text-xs font-serif uppercase tracking-wider font-bold gap-1 text-white"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Thêm món
                      </Button>
                    </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 col: Checkout Cart manager */}
        <div className="lg:col-span-1">
          <Card className="cafe-panel p-6 shadow-xl sticky top-24 max-h-[85vh] flex flex-col">
            <h3 className="font-serif font-black text-xl text-foreground pb-4 border-b border-border/60 flex items-center justify-between">
              Giỏ hàng của bạn 
              <Badge variant="success" className="font-bold font-mono">{cart.reduce((a,c)=>a+c.Quantity,0)} món</Badge>
            </h3>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 my-2 divide-y divide-border/40 max-h-[45vh]">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <ShoppingBag className="w-9 h-9 text-muted-foreground/30" />
                  <p className="text-xs font-semibold">Giỏ hàng đang trống.</p>
                  <p className="text-[10px] text-muted-foreground/70">Chọn cốc nước đặc sản ở cạnh và tùy biến độ ngọt/đá để thưởng thức.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={item.id} className={`pt-3 ${idx === 0 ? 'pt-0' : ''} flex flex-col gap-1 text-sm`}>
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-foreground line-clamp-1">{item.DrinkName} ({item.SizeName})</span>
                      <span className="font-mono font-bold text-primary text-xs">{(item.UnitPrice * item.Quantity).toLocaleString('vi-VN')} đ</span>
                    </div>
                    {/* Display customizations details */}
                    <p className="text-[10px] text-muted-foreground">Đường: {item.Sugar} | Đá: {item.Ice}</p>
                    {item.Toppings.length > 0 && (
                      <p className="text-[10px] text-primary/70">Topping: {item.Toppings.map(t=>t.name).join(', ')}</p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity modifier controls */}
                      <div className="flex items-center border border-border rounded-lg bg-background/50 h-7 overflow-hidden">
                        <button onClick={() => handleUpdateQty(item.id, -1)} className="px-2 hover:bg-muted text-xs font-bold font-mono">-</button>
                        <span className="px-2.5 text-xs font-mono font-bold text-foreground bg-background">{item.Quantity}</span>
                        <button onClick={() => handleUpdateQty(item.id, 1)} className="px-2 hover:bg-muted text-xs font-bold font-mono">+</button>
                      </div>

                      <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations and Order Details form */}
            {cart.length > 0 && (
              <div className="border-t border-border/80 pt-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tạm tính</span>
                    <span className="font-mono">{getSubtotal().toLocaleString('vi-VN')} đ</span>
                  </div>
                  {customer?.MemberShipLevel?.DiscountRate ? (
                    <div className="flex justify-between text-xs text-emerald-500 font-semibold">
                      <span>Giảm giá Hội viên ({customer.MemberShipLevel.DiscountRate}%)</span>
                      <span className="font-mono">-{getDiscountAmount().toLocaleString('vi-VN')} đ</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border/30">
                    <span>Tổng thanh toán</span>
                    <span className="font-mono text-primary">{getTotalPrice().toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wide">Số bàn (Tại quầy)</label>
                      <select 
                        value={tableId}
                        onChange={(e)=>setTableId(parseInt(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background/50 p-2 text-xs"
                      >
                        <option value={0}>Giao hàng mang đi</option>
                        {tables.map(t => (
                          <option key={t.ShopTableID} value={t.ShopTableID}>Bàn {t.ShopTableNumber}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wide">Số điện thoại</label>
                      <Input value={customer?.PhoneNumber || ''} disabled className="p-2 h-8 text-xs font-mono" />
                    </div>
                  </div>

                  {tableId === 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Địa chỉ giao hàng *</label>
                      <Input 
                        placeholder="Nhập địa chỉ nhà, văn phòng..." 
                        value={deliveryAddress}
                        onChange={(e)=>setDeliveryAddress(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Ghi chú pha chế</label>
                    <Input 
                      placeholder="Không thêm trân châu, nhiều đá..." 
                      value={orderNote}
                      onChange={(e)=>setOrderNote(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    if (!customer) {
                      toast.error('Vui lòng đăng nhập hoặc đăng ký để thanh toán!');
                      router.push('/login');
                      return;
                    }
                    if (tableId === 0 && !deliveryAddress) {
                      toast.error('Vui lòng cung cấp địa chỉ giao hàng.');
                      return;
                    }
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full rounded-xl py-3 font-serif uppercase tracking-wider font-extrabold text-sm text-white"
                >
                  Tiến hành thanh toán
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* A. Options Customize dialog modal */}
      {selectedDrink && (
        <Dialog 
          isOpen={!!selectedDrink}
          onClose={() => setSelectedDrink(null)}
          title={`Tùy chỉnh đồ uống: ${selectedDrink.DrinkName}`}
        >
          <div className="space-y-5">
            {/* 1. Size selection options */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block">Kích cỡ cốc (Sizes):</span>
              <div className="grid grid-cols-3 gap-3">
                {drinkSizes
                  .filter(ds => ds.DrinkID === selectedDrink.DrinkID && ds.DrinkSizeStatus === 'AVAILABLE')
                  .map(ds => (
                    <button
                      key={ds.DrinkSizeID}
                      type="button"
                      onClick={() => setSelectedSizeId(ds.DrinkSizeID)}
                      className={`border rounded-xl p-3 text-xs flex flex-col items-center justify-center transition-all ${
                        selectedSizeId === ds.DrinkSizeID
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-border bg-background/50 hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="text-base font-serif font-black">{ds.Size?.SizeName}</span>
                      <span className="font-mono text-[9px] text-muted-foreground mt-0.5">{ds.Size?.VolumeML}ml</span>
                      <span className="font-mono font-bold mt-1 text-[10px] text-primary">{ds.UnitPrice.toLocaleString('vi-VN')} đ</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* 2. Sugar customization levels */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block">Mức độ ngọt (Sugar):</span>
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
                {['0%', '30%', '50%', '70%', '100%'].map(sugar => (
                  <button
                    key={sugar}
                    type="button"
                    onClick={() => setSugarLevel(sugar)}
                    className={`py-2 rounded-lg border transition-all ${
                      sugarLevel === sugar
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background/30 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {sugar}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Ice customization levels */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block">Mức độ đá (Ice):</span>
              <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold">
                {['Nóng (Hot)', '50% đá', '100% đá'].map(ice => (
                  <button
                    key={ice}
                    type="button"
                    onClick={() => setIceLevel(ice)}
                    className={`py-2.5 rounded-xl border transition-all ${
                      iceLevel === ice
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background/30 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {ice}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Extra toppings list selection */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block">Thêm Toppings cao cấp:</span>
              <div className="space-y-2.5">
                {toppingsList.map(topping => {
                  const isChecked = selectedToppings.some(t => t.name === topping.name);
                  return (
                    <label 
                      key={topping.name}
                      onClick={() => toggleTopping(topping)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                        isChecked 
                          ? 'border-primary/50 bg-primary/5 font-semibold text-primary' 
                          : 'border-border bg-background/30 hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center font-mono ${isChecked ? 'bg-primary border-primary text-white' : 'border-border'}`}>
                          {isChecked ? '✓' : ''}
                        </span>
                        {topping.name}
                      </span>
                      <span className="font-mono text-primary font-bold">+{topping.price.toLocaleString('vi-VN')} đ</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Similar Products */}
            <div className="space-y-2 mt-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block">Sản phẩm tương tự:</span>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {drinks.filter(d => d.DrinkID !== selectedDrink.DrinkID && (
                    (selectedDrink.DrinkName.toLowerCase().includes('cà phê') && d.DrinkName.toLowerCase().includes('cà phê')) ||
                    (!selectedDrink.DrinkName.toLowerCase().includes('cà phê') && !d.DrinkName.toLowerCase().includes('cà phê'))
                  )).slice(0, 3).map(d => (
                  <button 
                    key={d.DrinkID} 
                    onClick={() => {
                      setSelectedDrink(d);
                      const sizes = drinkSizes.filter(s => s.DrinkID === d.DrinkID && s.DrinkSizeStatus === 'AVAILABLE');
                      if (sizes.length > 0) setSelectedSizeId(sizes[0].DrinkSizeID);
                    }}
                    className="shrink-0 w-32 rounded-xl overflow-hidden border border-border hover:border-primary transition-all text-left"
                  >
                    <div className="h-20 bg-muted relative">
                      {d.DrinkImageURL && <img src={d.DrinkImageURL} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2 bg-background">
                      <p className="text-[10px] font-bold truncate text-foreground">{d.DrinkName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Giá tùy chọn nước:</span>
                <span className="text-xl font-bold font-mono text-primary">{getCurrentCustomPrice().toLocaleString('vi-VN')} đ</span>
              </div>
              <Button 
                onClick={handleAddToCart}
                className="py-3 px-6 rounded-xl font-serif uppercase tracking-wider font-extrabold text-sm text-white"
              >
                Thêm Vào Giỏ Hàng
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* B. Simulated Payment sheet dialog modal */}
      {isCheckoutOpen && (
        <Dialog
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Xác nhận thanh toán đơn hàng"
        >
          <div className="space-y-6 text-center">
            <p className="text-xs text-muted-foreground">Chọn phương thức thanh toán để kết toán hóa đơn order:</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Payment Option 1: Cash/COD */}
              <button
                onClick={() => setPaymentMethod('COD')}
                className={`border rounded-2xl p-5 flex flex-col items-center justify-between gap-3 transition-all ${
                  paymentMethod === 'COD' 
                    ? 'border-orange-500 bg-orange-500/10 shadow-sm' 
                    : 'border-border bg-background/50 hover:bg-muted/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'COD' ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-600'}`}>
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <span className={`font-bold text-sm block ${paymentMethod === 'COD' ? 'text-orange-600' : 'text-foreground'}`}>Thanh Toán Tiền Mặt</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Trả tiền tại quầy</span>
                </div>
              </button>

              {/* Payment Option 2: Bank Transfer (QR) */}
              <button 
                onClick={() => setPaymentMethod('QR_CODE')}
                className={`border rounded-2xl p-5 flex flex-col items-center justify-between gap-3 transition-all ${
                  paymentMethod === 'QR_CODE' 
                    ? 'border-primary bg-primary/10 shadow-sm' 
                    : 'border-border bg-background/50 hover:bg-muted/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'QR_CODE' ? 'bg-primary text-white' : 'bg-primary/20 text-primary'}`}>
                  <span className="font-black text-xl">QR</span>
                </div>
                <div>
                  <span className={`font-bold text-sm block ${paymentMethod === 'QR_CODE' ? 'text-primary' : 'text-foreground'}`}>Chuyển khoản VietQR</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Quét mã nhận đơn ngay</span>
                </div>
              </button>
            </div>

            {/* VietQR Dynamic QR code visual mockup */}
            {paymentMethod === 'QR_CODE' && (
              <div className="mt-4 p-4 border border-border/50 rounded-2xl bg-muted/20 flex items-center gap-4 text-left animate-in fade-in zoom-in-95">
                <div className="w-24 h-24 bg-white rounded-xl p-2 border border-border flex items-center justify-center shrink-0">
                  <img src={`https://img.vietqr.io/image/vietinbank-101880510928-compact2.png?amount=${getTotalPrice()}&addInfo=PHELA${customer?.PhoneNumber?.slice(-4) || '9999'}&accountName=NGUYEN%20VAN%20KHOA`} alt="VietQR" className="w-full h-full object-contain" />
                </div>
                <div className="text-xs space-y-1.5 flex-1">
                  <p className="font-bold text-foreground">Thông tin chuyển khoản nhanh:</p>
                  <p>Ngân hàng: <span className="font-mono text-primary font-bold">VietinBank</span></p>
                  <p>Số tài khoản: <span className="font-mono text-primary font-bold">101880510928</span></p>
                  <p>Chủ tài khoản: <span className="font-mono text-primary font-bold">NGUYEN VAN KHOA</span></p>
                  <p>Số tiền: <span className="font-mono text-primary font-bold">{getTotalPrice().toLocaleString('vi-VN')} đ</span></p>
                  <p>Nội dung CK: <span className="font-mono text-primary font-bold">PHELA{customer?.PhoneNumber?.slice(-4) || '9999'}</span></p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 py-3.5 rounded-xl text-xs font-bold"
                onClick={() => setIsCheckoutOpen(false)}
              >
                Hủy
              </Button>
              <Button 
                className="flex-[2] py-3.5 rounded-xl text-xs font-bold text-white font-serif uppercase tracking-wider"
                onClick={() => handlePlaceOrder(paymentMethod)}
                disabled={isSubmittingOrder}
              >
                {isSubmittingOrder ? 'Đang tạo đơn...' : 'Xác nhận Đơn hàng'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
