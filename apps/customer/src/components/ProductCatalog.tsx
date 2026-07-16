import React from 'react';
import { Search, Sparkles, PlusCircle, Coffee } from 'lucide-react';
import { Input, Button, Card, Badge } from '@/components/ui/core';
import { Drink, DrinkSize, Customer } from '@/lib/api';

interface ProductCatalogProps {
  timeGreeting: string;
  customer: Customer | null;
  activeCategory: 'ALL' | 'MILK_TEA' | 'COFFEE';
  setActiveCategory: (cat: 'ALL' | 'MILK_TEA' | 'COFFEE') => void;
  frequentOrders: any[];
  drinks: Drink[];
  drinkSizes: DrinkSize[];
  toppingsList: { id: number; name: string; price: number }[];
  setSelectedDrink: (drink: Drink | null) => void;
  setSelectedSizeId: (id: number) => void;
  setSugarLevel: (val: string) => void;
  setIceLevel: (val: string) => void;
  setSelectedToppings: (t: any[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: any;
  setSortOption: (val: any) => void;
  minRating: number;
  setMinRating: (val: number) => void;
  minPrice: string;
  setMinPrice: (val: string) => void;
  maxPrice: string;
  setMaxPrice: (val: string) => void;
  isLoadingMenu: boolean;
  filteredDrinks: Drink[];
  paginatedDrinks: Drink[];
  currentPage: number;
  setCurrentPage: (val: number) => void;
  totalPages: number;
  handleOpenCustomize: (drink: Drink) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  timeGreeting,
  customer,
  activeCategory,
  setActiveCategory,
  frequentOrders,
  drinks,
  drinkSizes,
  toppingsList,
  setSelectedDrink,
  setSelectedSizeId,
  setSugarLevel,
  setIceLevel,
  setSelectedToppings,
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  minRating,
  setMinRating,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  isLoadingMenu,
  filteredDrinks,
  paginatedDrinks,
  currentPage,
  setCurrentPage,
  totalPages,
  handleOpenCustomize,
}) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h2 className="font-serif font-black text-2xl md:text-3xl text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> {timeGreeting}{customer ? `, ${customer.CustomerName.split(' ').pop()}!` : '! Hôm nay uống gì?'}
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-0.5">Đặt trực tuyến giao tận tay hoặc phục vụ tại quầy trong 15 phút</p>
        </div>

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

      {frequentOrders.length > 0 && (
        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3">
          <h3 className="font-serif font-bold text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Món tủ của bạn
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
            {frequentOrders.map((f: any, idx: number) => (
              <div key={idx} className="min-w-[200px] bg-background rounded-xl p-3 shadow-sm border border-border/50 snap-start shrink-0 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between" 
                onClick={() => {
                  const drinkObj = drinks.find(d => d.DrinkName === f.DrinkName);
                  if (drinkObj) {
                    setSelectedDrink(drinkObj);
                    setSelectedSizeId(f.DrinkSizeID);
                    setSugarLevel(f.PreferredConfig.Sugar);
                    setIceLevel(f.PreferredConfig.Ice);
                    const tps = f.PreferredConfig.Toppings ? f.PreferredConfig.Toppings.split(',') : [];
                    const tArr = tps.map((t:string) => toppingsList.find(x => x.name.trim() === t.trim())).filter(Boolean) as any;
                    setSelectedToppings(tArr);
                  }
                }}
              >
                <div>
                  <div className="text-sm font-bold text-foreground line-clamp-1">{f.DrinkName}</div>
                  <div className="text-[10px] font-semibold text-primary mt-0.5">Size {f.SizeName}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                    {f.PreferredConfig.Sugar} đường, {f.PreferredConfig.Ice} đá
                    {f.PreferredConfig.Toppings && `, ${f.PreferredConfig.Toppings}`}
                  </div>
                </div>
                <div className="mt-2 text-xs font-bold flex justify-between items-center">
                  <span>{f.UnitPrice.toLocaleString()}đ</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full bg-primary/10 text-primary">
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {paginatedDrinks.map((drink) => {
            const prices = drinkSizes.filter(ds => ds.DrinkID === drink.DrinkID).map(ds => ds.UnitPrice);
            const minPriceVal = prices.length > 0 ? Math.min(...prices) : 45000;
            
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
                  <span className="text-sm font-bold text-primary font-mono">Từ {minPriceVal.toLocaleString('vi-VN')} đ</span>
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
            )})}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-lg"
              >
                Trước
              </Button>
              <div className="text-xs font-bold font-mono">
                {currentPage} / {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg"
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
