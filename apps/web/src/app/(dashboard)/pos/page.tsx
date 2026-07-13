'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Trash2,
  User,
  Plus,
  Minus,
  CreditCard,
  Smile,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Ticket,
  Coffee,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button, Input, Card, Badge, Dialog } from '@/components/ui/core';
import { api, Drink, Size, DrinkSize, Customer, ShopTable, Promotion } from '@/lib/api';
import { toast } from 'sonner';

interface CartItem {
  DrinkID: number;
  DrinkSizeID: number;
  DrinkName: string;
  SizeName: string;
  UnitPrice: number;
  Quantity: number;
  Note: string;
}

export default function PosTerminal() {
  // Catalog states
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [drinkSizes, setDrinkSizes] = useState<DrinkSize[]>([]);
  const [tables, setTables] = useState<ShopTable[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Customer lookup states
  const [phoneSearch, setPhoneSearch] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Receipt states
  const [paidOrder, setPaidOrder] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Voucher states
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [dList, sList, dsList, tList, pList] = await Promise.all([
          api.getDrinks(),
          api.getSizes(),
          api.getDrinkSizes(),
          api.getTables(),
          api.getPromotions(),
        ]);
        setDrinks(dList);
        setSizes(sList);
        setDrinkSizes(dsList);
        setTables(tList);
        
        // Filter active promos
        const now = new Date();
        const active = pList.filter((p: Promotion) => {
          if (!p.IsActive) return false;
          if (p.StartDate && new Date(p.StartDate) > now) return false;
          if (p.EndDate && new Date(p.EndDate) < now) return false;
          return true;
        });
        setPromotions(active);
      } catch {}
      setIsLoading(false);
    };
    loadCatalog();
  }, []);

  // Poll active orders list or sync status every 5 seconds (mocked, keeps cart synchrony)
  useEffect(() => {
    const timer = setInterval(() => {
      // Keeps cart live
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Filter drinks
  const filteredDrinks = drinks.filter((d) => {
    const matchesSearch = d.DrinkName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && d.DrinkStatus === 'ACTIVE';
  });

  const handleLookupCustomer = async () => {
    if (!phoneSearch) {
      toast.error('Vui lòng nhập số điện thoại hội viên.');
      return;
    }
    try {
      const customers = await api.getCustomers();
      const match = customers.find((c) => c.PhoneNumber === phoneSearch);
      if (match) {
        setActiveCustomer(match);
        toast.success(
          `Tìm thấy Hội viên: ${match.CustomerName} (${match.MemberShipLevel?.LevelName || 'Thành viên'})`,
        );
      } else {
        toast.error('Không tìm thấy thông tin Hội viên. Hãy đăng ký mới.');
        setActiveCustomer(null);
      }
    } catch {}
  };

  const handleAddToCart = (drink: Drink, size: Size) => {
    const mapping = drinkSizes.find(
      (ds) => ds.DrinkID === drink.DrinkID && ds.SizeID === size.SizeID,
    );
    if (!mapping) {
      toast.error('Size này hiện không áp dụng cho đồ uống đã chọn.');
      return;
    }
    if (mapping.DrinkSizeStatus === 'UNAVAILABLE') {
      toast.error('Món đồ uống size này tạm thời hết hàng.');
      return;
    }

    const existingIdx = cart.findIndex((item) => item.DrinkSizeID === mapping.DrinkSizeID);
    if (existingIdx !== -1) {
      const updated = [...cart];
      updated[existingIdx]!.Quantity += 1;
      setCart(updated);
    } else {
      setCart((prev) => [
        ...prev,
        {
          DrinkID: drink.DrinkID,
          DrinkSizeID: mapping.DrinkSizeID,
          DrinkName: drink.DrinkName,
          SizeName: size.SizeName,
          UnitPrice: mapping.UnitPrice,
          Quantity: 1,
          Note: '',
        },
      ]);
    }
    toast.success(`Đã thêm ${drink.DrinkName} (${size.SizeName}) vào giỏ.`);
  };

  const updateCartQty = (idx: number, delta: number) => {
    const updated = [...cart];
    const item = updated[idx];
    if (!item) return;

    item.Quantity += delta;
    if (item.Quantity <= 0) {
      updated.splice(idx, 1);
      toast.info(`Đã xóa khỏi giỏ hàng.`);
    }
    setCart(updated);
  };

  const updateCartNote = (idx: number, note: string) => {
    const updated = [...cart];
    if (updated[idx]) {
      updated[idx]!.Note = note;
      setCart(updated);
    }
  };

  // Pricing calculations
  const baseTotal = cart.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0);
  const discountRate = activeCustomer?.MemberShipLevel?.DiscountRate || 0; // e.g. 10 (%)
  
  // Calculate Promotion Discount (Best applicable promo)
  let promotionDiscountAmount = 0;
  for (const promo of promotions) {
    let applicableItemsTotal = 0;
    let applicableQuantity = 0;
    
    let targetIds: number[] | null = null;
    if (promo.TargetDrinkIDs) {
      try {
        targetIds = JSON.parse(promo.TargetDrinkIDs);
      } catch {}
    }
    
    for (const item of cart) {
      if (!targetIds || targetIds.includes(item.DrinkSizeID)) {
        applicableItemsTotal += item.UnitPrice * item.Quantity;
        applicableQuantity += item.Quantity;
      }
    }

    if (applicableQuantity >= promo.MinQuantity) {
      let currentPromoDiscount = 0;
      if (promo.Type === 'PERCENT') {
        currentPromoDiscount = applicableItemsTotal * (promo.Value / 100);
      } else if (promo.Type === 'AMOUNT') {
        currentPromoDiscount = promo.Value;
      } else if (promo.Type === 'FREE_ITEM') {
        const applicableSorted = cart
          .filter(i => !targetIds || targetIds.includes(i.DrinkSizeID))
          .sort((a, b) => a.UnitPrice - b.UnitPrice);
        
        let freeItemsToGive = promo.Value;
        for (const item of applicableSorted) {
          if (freeItemsToGive <= 0) break;
          const qtyToFree = Math.min(item.Quantity, freeItemsToGive);
          currentPromoDiscount += qtyToFree * item.UnitPrice;
          freeItemsToGive -= qtyToFree;
        }
      }
      
      if (currentPromoDiscount > promotionDiscountAmount) {
        promotionDiscountAmount = currentPromoDiscount;
      }
    }
  }

  const promoRatio = baseTotal > 0 ? Math.max(0, (baseTotal - promotionDiscountAmount) / baseTotal) : 1;

  let voucherDiscount = 0;
  let targetItemTotal = 0;
  let otherItemsTotal = 0;

  if (appliedVoucher) {
    if (appliedVoucher.TargetProductID) {
      let applied = false;
      for (const item of cart) {
        if (item.DrinkSizeID === appliedVoucher.TargetProductID && !applied) {
           targetItemTotal += item.UnitPrice;
           otherItemsTotal += item.UnitPrice * (item.Quantity - 1);
           applied = true;
        } else {
           otherItemsTotal += item.UnitPrice * item.Quantity;
        }
      }
    } else {
       targetItemTotal = baseTotal;
       otherItemsTotal = 0;
    }

    targetItemTotal = targetItemTotal * promoRatio;
    otherItemsTotal = otherItemsTotal * promoRatio;

    if (appliedVoucher.DiscountType === 'PERCENT') {
      voucherDiscount = targetItemTotal * (appliedVoucher.DiscountValue / 100);
    } else {
      voucherDiscount = appliedVoucher.DiscountValue;
      if (voucherDiscount > targetItemTotal) voucherDiscount = targetItemTotal;
    }
  } else {
    otherItemsTotal = baseTotal * promoRatio;
  }

  const membershipDiscountAmount = otherItemsTotal * (discountRate / 100);
  const totalDiscount = Math.floor(promotionDiscountAmount) + Math.floor(voucherDiscount) + Math.floor(membershipDiscountAmount);
  const grandTotal = Math.max(0, baseTotal - totalDiscount);

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsApplyingVoucher(true);
    try {
      const v = await api.checkVoucher(voucherInput.trim(), activeCustomer?.CustomerID, undefined);
      
      if (v.TargetProductID) {
        const hasItem = cart.some(c => c.DrinkSizeID === v.TargetProductID);
        if (!hasItem) {
          toast.error('Giỏ hàng không chứa món nước được áp dụng mã giảm giá này.');
          setIsApplyingVoucher(false);
          return;
        }
      }
      
      setAppliedVoucher(v);
      toast.success('Áp dụng mã giảm giá thành công!');
    } catch (e: any) {
      toast.error(e.message);
      setAppliedVoucher(null);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống. Không thể thanh toán.');
      return;
    }

    const outOfStockItems = cart.filter(item => {
      const size = drinkSizes.find(s => s.DrinkSizeID === item.DrinkSizeID);
      return size?.IsOutOfStock;
    });

    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map(i => `${i.DrinkName} (${i.SizeName})`).join(', ');
      toast.error(`Món [${names}] đã hết nguyên liệu. Vui lòng xoá khỏi giỏ hàng.`);
      return;
    }

    try {
      const orderPayload = {
        CustomerID: activeCustomer?.CustomerID || null,
        ShopTableID: selectedTable || null,
        Items: cart.map((item) => ({
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          UnitPrice: item.UnitPrice,
        })),
        TotalPrice: grandTotal,
        OrderNote: cart
          .map((i) => (i.Note ? `${i.DrinkName}: ${i.Note}` : ''))
          .filter(Boolean)
          .join(' | '),
        VoucherCode: appliedVoucher ? appliedVoucher.Code : undefined,
      };

      const order = await api.createOrder(orderPayload);

      // Auto complete for demo convenience, updating levels
      await api.updateOrderStatus(order.OrderID, 'COMPLETED');

      toast.success(`Hóa đơn #${order.OrderID} đã thanh toán & hoàn thành thành công!`);

      // Calculate true total discount from backend response to cover promotions not calculated by frontend
      const trueTotalDiscount = baseTotal - order.TotalPrice;
      let finalVoucher = Math.floor(voucherDiscount);
      let finalMembership = Math.floor(membershipDiscountAmount);
      let promotionDiff = trueTotalDiscount - finalVoucher - finalMembership;

      // Store the paid order details for printing
      setPaidOrder({
        OrderID: order.OrderID,
        Customer: activeCustomer,
        TableNumber: selectedTable,
        Items: [...cart],
        BaseTotal: baseTotal,
        DiscountRate: discountRate,
        MembershipDiscountAmount: finalMembership,
        VoucherDiscountAmount: finalVoucher,
        PromotionDiscountAmount: promotionDiff > 0 ? promotionDiff : 0,
        AppliedVoucherCode: appliedVoucher ? appliedVoucher.Code : null,
        GrandTotal: order.TotalPrice,
        Date: new Date().toISOString(),
      });

      // reset states
      setCart([]);
      setSelectedTable(null);
      setActiveCustomer(null);
      setPhoneSearch('');
      setVoucherInput('');
      setAppliedVoucher(null);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xử lý thanh toán.');
    }
  };

  const handlePrintReceipt = () => {
    if (!paidOrder) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In Hóa Đơn #${paidOrder.OrderID}</title>
            <style>
              body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; color: #000; }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .dashed { border-bottom: 1px dashed #000; margin: 10px 0; }
              .flex { display: flex; justify-content: space-between; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 4px 0; text-align: left; }
              th.center, td.center { text-align: center; }
              th.right, td.right { text-align: right; }
              .line-through { text-decoration: line-through; font-size: 10px; color: #666; }
            </style>
          </head>
          <body>
            <div class="center">
              <h2 style="margin:0;">PHÊLA CAFE</h2>
              <p style="margin:2px 0;">Tầng 1, Tòa nhà Wow, TP. Hà Nội</p>
              <p style="margin:2px 0;">SĐT: 0123.456.789</p>
            </div>
            <div class="dashed"></div>
            <h3 class="center" style="margin:5px 0;">HÓA ĐƠN THANH TOÁN</h3>
            <p style="margin:2px 0;">Số HĐ: #${paidOrder.OrderID}</p>
            <p style="margin:2px 0;">Ngày: ${new Date(paidOrder.Date).toLocaleString('vi-VN')}</p>
            ${paidOrder.Customer ? `<p style="margin:2px 0;">Khách hàng: ${paidOrder.Customer.CustomerName}</p>` : ''}
            ${paidOrder.TableNumber ? `<p style="margin:2px 0;">Bàn: ${paidOrder.TableNumber}</p>` : ''}
            <div class="dashed"></div>
            <table>
              <thead>
                <tr>
                  <th>Món</th>
                  <th class="center">SL</th>
                  <th class="right">T.Tiền</th>
                </tr>
              </thead>
              <tbody>
                ${paidOrder.Items.map((item: any) => {
                  const itemTotal = item.UnitPrice * item.Quantity;
                  const discounted = itemTotal * (1 - paidOrder.DiscountRate / 100);
                  let priceHtml = itemTotal.toLocaleString('vi-VN');
                  if (paidOrder.DiscountRate > 0) {
                     priceHtml = `<div class="line-through">${itemTotal.toLocaleString('vi-VN')}</div><div>${discounted.toLocaleString('vi-VN')}</div>`;
                  }
                  return `
                    <tr>
                      <td style="padding-bottom: 4px;">
                        <div class="bold">${item.DrinkName} (${item.SizeName})</div>
                        <div style="font-size: 10px; color: #555;">Đường: ${item.Sugar}, Đá: ${item.Ice}</div>
                      </td>
                      <td class="center">${item.Quantity}</td>
                      <td class="right">${priceHtml}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="dashed"></div>
            <div class="flex">
              <span>Tổng cộng:</span>
              <span class="bold">${paidOrder.BaseTotal.toLocaleString('vi-VN')}đ</span>
            </div>
            ${
              paidOrder.VoucherDiscountAmount > 0
                ? `<div class="flex">
                  <span>Voucher (${paidOrder.AppliedVoucherCode}):</span>
                  <span>-${paidOrder.VoucherDiscountAmount.toLocaleString('vi-VN')}đ</span>
                </div>`
                : ''
            }
            ${
              paidOrder.MembershipDiscountAmount > 0
                ? `<div class="flex">
                  <span>Hội viên (${paidOrder.DiscountRate}%):</span>
                  <span>-${paidOrder.MembershipDiscountAmount.toLocaleString('vi-VN')}đ</span>
                </div>`
                : ''
            }
            ${
              paidOrder.PromotionDiscountAmount > 0
                ? `<div class="flex">
                  <span>CT Khuyến Mãi:</span>
                  <span>-${paidOrder.PromotionDiscountAmount.toLocaleString('vi-VN')}đ</span>
                </div>`
                : ''
            }
            <div class="dashed"></div>
            <div class="flex">
              <span class="bold">THÀNH TIỀN:</span>
              <span class="bold">${paidOrder.GrandTotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <div class="dashed"></div>
            <p class="center" style="font-style: italic;">Cảm ơn quý khách và hẹn gặp lại!</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6 animate-fade-in font-sans">
      {/* 1. LEFT PANEL: Drink Menu Catalog */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm đồ uống Phêla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3 rounded-xl cafe-panel"
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'Oolong', 'Sữa', 'Cà phê'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                  selectedCategory === cat
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Promotional Banner */}
        {promotions.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md p-4 flex items-center justify-between animate-fade-in-up mt-1 mb-1">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  Khuyến Mãi Đang Diễn Ra
                  <Badge variant="warning" className="bg-white text-amber-600 px-2 py-0">LIVE</Badge>
                </h3>
                <p className="text-white/90 text-sm">
                  {promotions.map(p => {
                     const condition = p.MinQuantity > 0 ? ` (Mua từ ${p.MinQuantity} ly)` : '';
                     const val = p.Type === 'PERCENT' ? `giảm ${p.Value}%` : p.Type === 'AMOUNT' ? `giảm ${p.Value.toLocaleString()}đ` : `tặng ${p.Value} ly`;
                     return `${p.Name}: ${val}${condition}`;
                  }).join(' | ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Cards List */}
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredDrinks.map((drink) => (
            <Card
              key={drink.DrinkID}
              className="p-4 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 group"
            >
              <div>
                {/* Drink Image */}
                {drink.DrinkImageURL ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted mb-3">
                    <img
                      src={drink.DrinkImageURL}
                      alt={drink.DrinkName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23C8763A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coffee"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12Z"/><path d="M17 12h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/><path d="M6 2v2"/></svg>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-muted rounded-xl mb-3 flex items-center justify-center">
                    <Coffee className="w-8 h-8 text-primary/45" />
                  </div>
                )}
                
                <h4 className="font-serif font-black text-base text-foreground tracking-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                  {drink.DrinkName}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                  {drink.DrinkDescription || 'Không có mô tả.'}
                </p>
              </div>

              {/* Sizes Buttons selector trigger */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block">
                  Chọn kích cỡ ly:
                </span>
                <div className="flex gap-2">
                  {sizes.map((size) => {
                    const priceMapping = drinkSizes.find(
                      (ds) => ds.DrinkID === drink.DrinkID && ds.SizeID === size.SizeID,
                    );
                    if (!priceMapping) return null;
                    return (
                      <button
                        key={size.SizeID}
                        disabled={priceMapping.IsOutOfStock}
                        onClick={() => handleAddToCart(drink, size)}
                        className={`flex-1 py-2 px-1 rounded-xl border transition-all text-center flex flex-col items-center justify-center font-sans ${
                          priceMapping.IsOutOfStock
                            ? 'border-border/50 bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                            : 'border-border bg-background hover:bg-primary hover:text-white active:scale-95 group'
                        }`}
                      >
                        <span className="text-xs font-extrabold">{size.SizeName}</span>
                        {priceMapping.IsOutOfStock ? (
                          <span className="text-[9px] font-bold text-red-500 font-sans mt-0.5">
                            Hết
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-muted-foreground group-hover:text-white/80 font-mono mt-0.5">
                            {(priceMapping.UnitPrice / 1000).toFixed(0)}k
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 2. CENTER PANEL: Point-of-sale Cart list */}
      <div className="w-full lg:w-[380px] flex flex-col border border-border rounded-3xl bg-card/60 backdrop-blur-md overflow-hidden cafe-panel">
        <div className="h-16 border-b border-border/80 bg-muted/30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h3 className="font-serif font-bold text-base text-foreground tracking-tight">
              Giỏ hàng chờ
            </h3>
          </div>
          <Badge variant="neutral">{cart.reduce((sum, i) => sum + i.Quantity, 0)} ly</Badge>
        </div>

        {/* Cart Item rows list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
              <Coffee className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold">Giỏ hàng đang trống</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Chọn món nước bên cạnh để thêm.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.DrinkSizeID}
                className="p-3.5 rounded-2xl border border-border bg-background/50 flex flex-col gap-2 relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-foreground line-clamp-1">
                      {item.DrinkName}
                    </h5>
                    <span className="text-[10px] font-semibold text-primary uppercase">
                      Size: {item.SizeName}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    {discountRate > 0 ? (
                      <>
                        <span className="text-[10px] font-bold font-mono text-muted-foreground line-through">
                          {(item.UnitPrice * item.Quantity).toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-xs font-bold font-mono text-primary">
                          {((item.UnitPrice * item.Quantity) * (1 - discountRate / 100)).toLocaleString('vi-VN')}đ
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-bold font-mono text-foreground">
                        {(item.UnitPrice * item.Quantity).toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </div>
                </div>

                {/* note and qty counters */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                  <Input
                    placeholder="Ghi chú ly... (đá, đường)"
                    value={item.Note}
                    onChange={(e) => updateCartNote(idx, e.target.value)}
                    className="h-8 text-xs bg-background/20 max-w-[140px] px-2 py-0"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(idx, -1)}
                      className="w-6 h-6 rounded bg-muted hover:bg-primary hover:text-white flex items-center justify-center text-xs font-bold transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center">
                      {item.Quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(idx, 1)}
                      className="w-6 h-6 rounded bg-muted hover:bg-primary hover:text-white flex items-center justify-center text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. RIGHT PANEL: Customer, Table and Payouts */}
      <div className="w-full lg:w-[350px] flex flex-col border border-border rounded-3xl bg-card/60 backdrop-blur-md p-6 justify-between cafe-panel">
        {/* Customer Loyalty Search */}
        <div className="space-y-4">
          <div className="pb-4 border-b border-border/60">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
              Thành viên (Loyalty)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="SĐT Hội viên..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="pl-9 py-2 rounded-xl bg-background/40"
                />
              </div>
              <Button
                onClick={handleLookupCustomer}
                size="sm"
                variant="outline"
                className="rounded-xl"
              >
                Tìm
              </Button>
            </div>

            {activeCustomer && (
              <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-primary" /> {activeCustomer.CustomerName}
                  </h5>
                  <span className="text-[9px] font-bold text-primary block mt-0.5 uppercase tracking-wider">
                    {activeCustomer.MemberShipLevel?.LevelName}
                  </span>
                </div>
                <Badge variant="success">Giảm {discountRate}%</Badge>
              </div>
            )}
          </div>

          {/* Table Selector */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
              Chọn Bàn Phục Vụ
            </label>
            <div className="grid grid-cols-4 gap-2">
              {tables.map((t) => (
                <button
                  key={t.ShopTableID}
                  onClick={() => setSelectedTable(t.ShopTableID)}
                  className={`h-10 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center active:scale-95 ${
                    selectedTable === t.ShopTableID
                      ? 'bg-primary border-primary text-white shadow-md'
                      : 'bg-background border-border hover:bg-muted text-foreground'
                  }`}
                >
                  Bàn {t.ShopTableNumber}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing totals and checkout trigger */}
        <div className="space-y-4 pt-6 border-t border-border/60">
          <div className="space-y-2 text-xs">
            
            {/* Voucher input block */}
            <div className="flex gap-2 mb-4 border-b border-border/40 pb-4">
              <Input
                placeholder="Nhập Voucher..."
                className="h-8 text-xs flex-1"
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
                disabled={!!appliedVoucher}
              />
              {!appliedVoucher ? (
                <Button 
                  size="sm" 
                  className="h-8 text-xs font-bold" 
                  onClick={handleApplyVoucher} 
                  disabled={isApplyingVoucher || !voucherInput}
                >
                  {isApplyingVoucher ? '...' : 'Áp dụng'}
                </Button>
              ) : (
                <Button size="sm" variant="danger" className="h-8 px-2" onClick={() => {
                  setAppliedVoucher(null);
                  setVoucherInput('');
                }}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex justify-between text-muted-foreground font-semibold">
              <span>Tổng tiền món:</span>
              <span className="font-mono">{baseTotal.toLocaleString('vi-VN')} đ</span>
            </div>
            
            {appliedVoucher && (
              <div className="flex justify-between text-primary font-bold">
                <span className="flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5" /> Voucher ({appliedVoucher.Code}):
                </span>
                <span className="font-mono">-{Math.floor(voucherDiscount).toLocaleString('vi-VN')} đ</span>
              </div>
            )}

            {Math.floor(membershipDiscountAmount) > 0 && (
              <div className="flex justify-between text-primary font-bold">
                <span className="flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5" /> Hội viên ({discountRate}%):
                </span>
                <span className="font-mono">-{Math.floor(membershipDiscountAmount).toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-foreground border-t border-border/40 pt-2">
              <span>Thanh toán:</span>
              <span className="font-mono text-primary">{grandTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>

          <Button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full py-4 text-sm font-serif uppercase tracking-widest font-extrabold gap-2 rounded-2xl"
          >
            <CreditCard className="w-4 h-4" /> Xác nhận & In hóa đơn
          </Button>
        </div>
      </div>

      {/* Checkout details Confirmation dialog */}
      <Dialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Xác nhận thanh toán"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2">
            <h5 className="font-serif font-black text-center text-lg text-primary tracking-wide mb-2 uppercase">
              Hóa Đơn Phêla
            </h5>
            <div className="divide-y divide-border text-xs">
              {cart.map((item) => (
                <div key={item.DrinkSizeID} className="flex justify-between py-2.5">
                  <span>
                    {item.DrinkName} ({item.SizeName}) x {item.Quantity}
                  </span>
                  <div className="flex flex-col items-end font-mono">
                    {discountRate > 0 ? (
                      <>
                        <span className="text-[10px] text-muted-foreground line-through">
                          {(item.UnitPrice * item.Quantity).toLocaleString('vi-VN')} đ
                        </span>
                        <span>
                          {((item.UnitPrice * item.Quantity) * (1 - discountRate / 100)).toLocaleString('vi-VN')} đ
                        </span>
                      </>
                    ) : (
                      <span>
                        {(item.UnitPrice * item.Quantity).toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/80 pt-2 mt-2 space-y-1 text-xs">
              {activeCustomer && (
                <div className="flex justify-between text-primary font-bold">
                  <span>Ưu đãi thành viên ({discountRate}%):</span>
                  <span>-{membershipDiscountAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {selectedTable && (
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Bàn phục vụ:</span>
                  <span>Bàn số {selectedTable}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-foreground pt-2 border-t border-dashed border-border">
                <span>Tổng cộng thanh toán:</span>
                <span className="text-primary font-mono">
                  {grandTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 py-3 rounded-xl"
              onClick={() => setIsCheckoutOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="flex-1 py-3 rounded-xl font-serif uppercase tracking-wider font-extrabold"
              onClick={handleCheckoutSubmit}
            >
              Thanh Toán
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Receipt Dialog after checkout */}
      <Dialog
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Thanh toán thành công!"
      >
        <div className="space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-center">Đơn hàng #{paidOrder?.OrderID}</h4>
          <p className="text-center text-muted-foreground text-sm">
            Hóa đơn đã được thanh toán hoàn tất. Bạn có muốn in hóa đơn cho khách không?
          </p>
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1 py-3 rounded-xl"
              onClick={() => setIsReceiptOpen(false)}
            >
              Đóng (Lên đơn mới)
            </Button>
            <Button
              className="flex-1 py-3 rounded-xl font-serif uppercase tracking-wider font-extrabold gap-2"
              onClick={handlePrintReceipt}
            >
              <Ticket className="w-4 h-4" /> In Hóa Đơn
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
