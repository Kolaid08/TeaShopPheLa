import React from 'react';
import { Dialog, Button } from '@/components/ui/core';

interface CustomizeDialogProps {
  selectedDrink: any;
  setSelectedDrink: (drink: any) => void;
  drinkSizes: any[];
  selectedSizeId: number;
  setSelectedSizeId: (id: number) => void;
  sugarLevel: string;
  setSugarLevel: (level: string) => void;
  iceLevel: string;
  setIceLevel: (level: string) => void;
  toppingsList: { id: number; name: string; price: number }[];
  selectedToppings: { id: number; name: string; price: number }[];
  toggleTopping: (topping: { id: number; name: string; price: number }) => void;
  drinks: any[];
  getCurrentCustomPrice: () => number;
  handleAddToCart: () => void;
}

export const CustomizeDialog: React.FC<CustomizeDialogProps> = ({
  selectedDrink,
  setSelectedDrink,
  drinkSizes,
  selectedSizeId,
  setSelectedSizeId,
  sugarLevel,
  setSugarLevel,
  iceLevel,
  setIceLevel,
  toppingsList,
  selectedToppings,
  toggleTopping,
  drinks,
  getCurrentCustomPrice,
  handleAddToCart
}) => {
  if (!selectedDrink) return null;

  return (
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
                  disabled={ds.IsOutOfStock}
                  onClick={() => setSelectedSizeId(ds.DrinkSizeID)}
                  className={`border rounded-xl p-3 text-xs flex flex-col items-center justify-center transition-all ${
                    ds.IsOutOfStock
                      ? 'border-border/50 bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                      : selectedSizeId === ds.DrinkSizeID
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-border bg-background/50 hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="text-base font-serif font-black">{ds.Size?.SizeName}</span>
                  <span className="font-mono text-[9px] mt-0.5">{ds.Size?.VolumeML}ml</span>
                  {ds.IsOutOfStock ? (
                    <span className="font-sans font-bold mt-1 text-[10px] text-red-500">Hết nguyên liệu</span>
                  ) : (
                    <span className="font-mono font-bold mt-1 text-[10px] text-primary">{ds.UnitPrice.toLocaleString('vi-VN')} đ</span>
                  )}
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
              const isChecked = selectedToppings.some(t => t.id === topping.id);
              return (
                <label 
                  key={topping.id}
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
                  const sizes = drinkSizes.filter(s => s.DrinkID === d.DrinkID && s.DrinkSizeStatus === 'AVAILABLE' && !s.IsOutOfStock);
                  if (sizes.length > 0) setSelectedSizeId(sizes[0]?.DrinkSizeID!);
                  else setSelectedSizeId(0);
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
            disabled={!selectedSizeId || drinkSizes.find(s => s.DrinkSizeID === selectedSizeId)?.IsOutOfStock}
            className={`py-3 px-6 rounded-xl font-serif uppercase tracking-wider font-extrabold text-sm ${(!selectedSizeId || drinkSizes.find(s => s.DrinkSizeID === selectedSizeId)?.IsOutOfStock) ? 'bg-muted text-muted-foreground' : 'text-white'}`}
          >
            {!selectedSizeId || drinkSizes.find(s => s.DrinkSizeID === selectedSizeId)?.IsOutOfStock ? 'Hết nguyên liệu' : 'Thêm Vào Giỏ Hàng'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
