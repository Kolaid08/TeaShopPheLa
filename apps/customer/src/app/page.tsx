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
  X,
  Gift,
  Copy,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Badge,
  Dialog,
} from '@/components/ui/core';

import { VoucherWallet } from '@/components/VoucherWallet';
import { api, Drink, DrinkSize, Customer, ShopTable } from '@/lib/api';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { CustomizeDialog } from '@/components/CustomizeDialog';
import { CheckoutModal } from '@/components/CheckoutModal';
import { ProductCatalog } from '@/components/ProductCatalog';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

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
  Toppings: { id: number; name: string; price: number }[];
}

export default function CustomerHome() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Data lists
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [drinkSizes, setDrinkSizes] = useState<DrinkSize[]>([]);
  const [tables, setTables] = useState<ShopTable[]>([]);
  const [frequentOrders, setFrequentOrders] = useState<any[]>([]);
  const [timeGreeting, setTimeGreeting] = useState('Xin chào');
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'MILK_TEA' | 'COFFEE'>('ALL');
  const [sortOption, setSortOption] = useState<'NEWEST' | 'BEST_SELLING' | 'PRICE_ASC' | 'PRICE_DESC' | 'REVIEWS'>('NEWEST');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Customization Modal states
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number>(0);
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('100%');
  const [selectedToppings, setSelectedToppings] = useState<{ id: number; name: string; price: number }[]>([]);

  // Cart & Checkout states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR_CODE'>('COD');
  
  // Delivery states
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('TAKEAWAY');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  
  // GHN Address States
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number>(0);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(0);
  const [selectedWardCode, setSelectedWardCode] = useState<string>('');
  const [ghnShippingFee, setGhnShippingFee] = useState<number>(0);
  
  // PayOS states
  const [payOsQrCode, setPayOsQrCode] = useState<string>('');
  const [payOsDetails, setPayOsDetails] = useState<{ accountNumber?: string; description?: string; bin?: string; amount?: number } | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Available options
  const [toppingsList, setToppingsList] = useState<{ id: number; name: string; price: number }[]>([]);

  useEffect(() => {
    api.getToppings().then((data) => {
      if (data && data.length > 0) {
        setToppingsList(data.map((t: any) => ({ id: t.ToppingID, name: t.Name, price: Number(t.Price) })));
      }
    });
  }, []);

  // Voucher states
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [comboSuggestions, setComboSuggestions] = useState<any[]>([]);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);

  // Share states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    api.getActivePromotions().then(setActivePromotions);
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      const drinkSizeIds = cart.map(c => c.DrinkSizeID);
      api.getComboSuggestions(drinkSizeIds).then(setComboSuggestions);
    } else {
      setComboSuggestions([]);
    }
  }, [cart]);

  // GHN hooks
  useEffect(() => {
    api.getProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (selectedProvinceId) {
      api.getDistricts(selectedProvinceId).then(setDistricts);
      setSelectedDistrictId(0);
      setSelectedWardCode('');
      setGhnShippingFee(0);
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvinceId]);

  useEffect(() => {
    if (selectedDistrictId) {
      api.getWards(selectedDistrictId).then(setWards);
      setSelectedWardCode('');
      setGhnShippingFee(0);
    } else {
      setWards([]);
    }
  }, [selectedDistrictId]);

  useEffect(() => {
    if (selectedDistrictId && selectedWardCode && cart.length > 0) {
      const items = cart.map(item => ({ DrinkSizeID: item.DrinkSizeID, Quantity: item.Quantity }));
      api.calculateFee({ to_district_id: selectedDistrictId, to_ward_code: selectedWardCode, items })
        .then(res => setGhnShippingFee(res.fee))
        .catch(() => setGhnShippingFee(0));
    } else {
      setGhnShippingFee(0);
    }
  }, [selectedDistrictId, selectedWardCode, cart]);

  useEffect(() => {
    // Authenticate check
    const active = api.getCurrentCustomer();
    setCustomer(active);
    setIsLoadingUser(false);

    // Sync latest customer rank from backend
    if (active && active.PhoneNumber) {
      api.syncCustomerProfile(active.PhoneNumber).then((updatedCust) => {
        if (updatedCust) setCustomer(updatedCust);
      });
    }

    const hour = new Date().getHours();
    if (hour < 12) setTimeGreeting('Chào buổi sáng');
    else if (hour < 18) setTimeGreeting('Chào buổi chiều');
    else setTimeGreeting('Chào buổi tối');

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

        if (active && active.CustomerID) {
          const freqs = await api.getFrequentOrders(active.CustomerID);
          setFrequentOrders(freqs);
        }
      } catch {}
      setIsLoadingMenu(false);
    };
    loadData();

    // Load cart from LocalStorage
    const savedCart = localStorage.getItem('phela_customer_cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    // Listen to AI Buy Now
    const handleAIBuyNow = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { code, drinkSizeId } = customEvent.detail;
      
      try {
        // Set voucher input
        setVoucherInput(code);
        
        // Check and apply voucher
        const v = await api.checkVoucher(code, active?.CustomerID, undefined);
        setAppliedVoucher(v);
        
        toast.success('Đã áp dụng mã giảm giá thành công! Vui lòng kiểm tra giỏ hàng.');
      } catch (err: any) {
        toast.error(err.message || 'Có lỗi xảy ra khi áp dụng mã.');
      }
    };
    
    const handleAIAddCombo = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { drinkSizeIds } = customEvent.detail;
      
      try {
        const sizes = await api.getDrinkSizes();
        const allDrinks = await api.getDrinks();
        
        let currentCartStr = localStorage.getItem('phela_customer_cart');
        let currentCart = currentCartStr ? JSON.parse(currentCartStr) : [];
        let addedCount = 0;
        
        for (const dId of drinkSizeIds) {
          const dSize = sizes.find((ds: any) => ds.DrinkSizeID === dId && ds.DrinkSizeStatus !== 'UNAVAILABLE');
          if (!dSize) continue;
          
          const drinkInfo = allDrinks.find((d: any) => d.DrinkID === dSize.DrinkID);
          if (!drinkInfo) continue;
          
          const itemKey = `${dSize.DrinkSizeID}-100%-100%-`;
          const existingIdx = currentCart.findIndex((item: any) => item.id === itemKey);
          
          if (existingIdx !== -1) {
            currentCart[existingIdx].Quantity += 1;
          } else {
            currentCart.push({
              id: itemKey,
              DrinkSizeID: dSize.DrinkSizeID,
              DrinkName: drinkInfo.DrinkName,
              SizeName: dSize.Size?.SizeName || 'M',
              UnitPrice: Number(dSize.UnitPrice),
              Quantity: 1,
              Sugar: '100%',
              Ice: '100%',
              Toppings: [],
            });
          }
          addedCount++;
        }
        
        if (addedCount > 0) {
          setCart(currentCart);
          localStorage.setItem('phela_customer_cart', JSON.stringify(currentCart));
          toast.success(`Đã thêm ${addedCount} ly nước của Combo vào giỏ hàng!`);
        } else {
          toast.error('Các sản phẩm trong Combo này hiện đang hết hàng.');
        }
      } catch(err) {
         toast.error('Lỗi khi thêm Combo vào giỏ hàng.');
      }
    };
    
    window.addEventListener('ai_buy_now', handleAIBuyNow);
    window.addEventListener('ai_add_combo', handleAIAddCombo);
    return () => {
      window.removeEventListener('ai_buy_now', handleAIBuyNow);
      window.removeEventListener('ai_add_combo', handleAIAddCombo);
    };
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
    localStorage.removeItem('phela_customer_cart');
    localStorage.removeItem('phela_session_id');
    localStorage.removeItem('chat_session_id');
    setCart([]);
    
    api.customerLogout();
    toast.success('Đã đăng xuất cổng hội viên.');
    router.push('/login');
  };

  // Open Customize Dialog
  const handleOpenCustomize = (drink: Drink) => {
    setSelectedDrink(drink);
    // Find first available size
    const availableSizes = drinkSizes.filter((ds) => ds.DrinkID === drink.DrinkID && ds.DrinkSizeStatus === 'AVAILABLE' && !ds.IsOutOfStock);
    if (availableSizes.length > 0 && availableSizes[0]) {
      setSelectedSizeId(availableSizes[0].DrinkSizeID);
    } else {
      setSelectedSizeId(0); // None available
    }
    setSugarLevel('100%');
    setIceLevel('100%');
    setSelectedToppings([]);
  };

  const toggleTopping = (topping: { id: number; name: string; price: number }) => {
    const idx = selectedToppings.findIndex((t) => t.id === topping.id);
    if (idx === -1) {
      setSelectedToppings((prev) => [...prev, topping]);
    } else {
      setSelectedToppings((prev) => prev.filter((t) => t.id !== topping.id));
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
  
  const getCalculations = () => {
    const subtotal = getSubtotal();
    let membershipDiscountRate = customer?.MemberShipLevel?.DiscountRate || 0;
    
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
         targetItemTotal = subtotal;
         otherItemsTotal = 0;
      }

      if (appliedVoucher.DiscountType === 'PERCENT') {
        voucherDiscount = targetItemTotal * (appliedVoucher.DiscountValue / 100);
      } else {
        voucherDiscount = appliedVoucher.DiscountValue;
        if (voucherDiscount > targetItemTotal) voucherDiscount = targetItemTotal;
      }
    } else {
      otherItemsTotal = subtotal;
    }

    let promotionDiscount = 0;
    
    // Calculate combo promotion discount
    if (activePromotions.length > 0) {
      for (const promo of activePromotions) {
        if (!promo.TargetDrinkIDs) {
          // Store-wide or general promotion based on total items
          const totalItems = cart.reduce((acc, curr) => acc + curr.Quantity, 0);
          if (totalItems >= promo.MinQuantity) {
            if (promo.Type === 'PERCENT') {
              promotionDiscount += subtotal * (promo.Value / 100);
            } else if (promo.Type === 'AMOUNT') {
              promotionDiscount += promo.Value;
            } else if (promo.Type === 'FREE_ITEM') {
              // Get the cheapest item price for the free item
              const sortedCart = [...cart].sort((a, b) => a.UnitPrice - b.UnitPrice);
              if (sortedCart.length > 0) {
                // Determine how many times the promotion applies
                const multiplier = Math.floor(totalItems / promo.MinQuantity);
                const maxFreeItems = Math.min(promo.Value * multiplier, totalItems);
                
                let currentFreeCount = 0;
                for (const item of sortedCart) {
                  if (currentFreeCount >= maxFreeItems) break;
                  
                  const applyCount = Math.min(item.Quantity, maxFreeItems - currentFreeCount);
                  promotionDiscount += item.UnitPrice * applyCount;
                  currentFreeCount += applyCount;
                }
              }
            }
          }
        } else {
          // Specific item promotion
          try {
            const targetIds = JSON.parse(promo.TargetDrinkIDs);
            const qualifyingItems = cart.filter(c => targetIds.includes(c.DrinkSizeID));
            const qualifyingCount = qualifyingItems.reduce((acc, curr) => acc + curr.Quantity, 0);
            
            if (qualifyingCount >= promo.MinQuantity) {
              const qualifyingTotal = qualifyingItems.reduce((acc, curr) => acc + (curr.UnitPrice * curr.Quantity), 0);
              if (promo.Type === 'PERCENT') {
                promotionDiscount += qualifyingTotal * (promo.Value / 100);
              } else if (promo.Type === 'AMOUNT') {
                promotionDiscount += promo.Value;
              } else if (promo.Type === 'FREE_ITEM') {
                const sortedQualifying = [...qualifyingItems].sort((a, b) => a.UnitPrice - b.UnitPrice);
                if (sortedQualifying.length > 0) {
                  const multiplier = Math.floor(qualifyingCount / promo.MinQuantity);
                  const maxFreeItems = Math.min(promo.Value * multiplier, qualifyingCount);
                  
                  let currentFreeCount = 0;
                  for (const item of sortedQualifying) {
                    if (currentFreeCount >= maxFreeItems) break;
                    
                    const applyCount = Math.min(item.Quantity, maxFreeItems - currentFreeCount);
                    promotionDiscount += item.UnitPrice * applyCount;
                    currentFreeCount += applyCount;
                  }
                }
              }
            }
          } catch(e) {}
        }
      }
    }

    const membershipDiscountAmount = otherItemsTotal * (membershipDiscountRate / 100);
    const baseFinal = subtotal - Math.floor(voucherDiscount) - Math.floor(promotionDiscount) - Math.floor(membershipDiscountAmount);
    
    let shippingFee = 0;
    if (orderType === 'DELIVERY') {
      if (baseFinal >= 300000) {
         shippingFee = 0; // Free ship if > 300k
      } else {
         shippingFee = ghnShippingFee;
      }
    }
    
    const finalTotal = baseFinal + shippingFee;
    
    return {
      subtotal,
      voucherDiscount: Math.floor(voucherDiscount),
      promotionDiscount: Math.floor(promotionDiscount),
      membershipDiscount: Math.floor(membershipDiscountAmount),
      shippingFee,
      total: Math.floor(finalTotal > 0 ? finalTotal : 0)
    };
  };

  const { subtotal, voucherDiscount, promotionDiscount, membershipDiscount, shippingFee, total } = getCalculations();
  const getTotalPrice = () => total;

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsApplyingVoucher(true);
    try {
      const v = await api.checkVoucher(voucherInput.trim(), customer?.CustomerID, undefined);
      
      // Check if target item is in cart
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

  // Submit checkout Order
  const handlePlaceOrder = async (method: 'QR_CODE' | 'COD') => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống! Vui lòng chọn món nước.');
      return;
    }

    const outOfStockItems = cart.filter(item => {
      const size = drinkSizes.find(s => s.DrinkSizeID === item.DrinkSizeID);
      return size?.IsOutOfStock;
    });

    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map(i => `${i.DrinkName} (${i.SizeName})`).join(', ');
      toast.error(`Rất tiếc! Món [${names}] hiện đã hết nguyên liệu. Vui lòng xoá khỏi giỏ hàng.`);
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const provinceName = provinces.find(p => p.ProvinceID === selectedProvinceId)?.ProvinceName || '';
      const districtName = districts.find(d => d.DistrictID === selectedDistrictId)?.DistrictName || '';
      const wardName = wards.find(w => w.WardCode === selectedWardCode)?.WardName || '';
      const fullAddress = [deliveryAddress, wardName, districtName, provinceName].filter(Boolean).join(', ');

      const orderPayload = {
        Items: cart.map((item) => ({
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          Sugar: item.Sugar,
          Ice: item.Ice,
          Toppings: Array.isArray(item.Toppings) 
            ? item.Toppings.map((t: any) => typeof t === 'object' ? (t.id || t.ToppingID) : t)
            : undefined,
          UnitPrice: Number(item.UnitPrice),
        })),
        SessionID: localStorage.getItem('phela_session_id') || '',
        TotalPrice: getTotalPrice(),
        ShopTableID: tableId > 0 ? tableId : undefined,
        OrderNote: `${deliveryAddress ? `Giao hàng: ${deliveryAddress}` : ''}${orderNote ? ` | Ghi chú: ${orderNote}` : ''}`,
        OrderType: orderType,
        ShippingAddress: fullAddress || undefined,
        ProvinceID: selectedProvinceId || undefined,
        DistrictID: selectedDistrictId || undefined,
        WardCode: selectedWardCode || undefined,
        ReceiverName: receiverName || undefined,
        ReceiverPhone: receiverPhone || undefined,
        VoucherCode: appliedVoucher ? appliedVoucher.Code : undefined,
      };

      const res = await api.createCustomerOrder(orderPayload);
      
      if (method === 'QR_CODE') {
        const payOsRes = await api.createPayOSLink(res.OrderID, res.TotalPrice);
        setPayOsQrCode(payOsRes.qrCode);
        setPayOsDetails({
          accountNumber: payOsRes.accountNumber,
          description: payOsRes.description,
          bin: payOsRes.bin,
          amount: payOsRes.amount,
        });
        setActiveOrderId(res.OrderID);
        setIsPolling(true);
        toast.info('Vui lòng quét mã QR để thanh toán.');
      } else {
        // Reset Giỏ hàng
        saveCartState([]);
        setOrderNote('');
        setDeliveryAddress('');
        setIsCheckoutOpen(false);
        
        toast.success('Đặt trà sữa thành công! Quầy lễ tân Phêla đã nhận được đơn.');
        router.push('/history');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi đơn đặt hàng.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Polling for PayOS payment status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && activeOrderId) {
      interval = setInterval(async () => {
        try {
          const statusRes = await api.getOrderStatus(activeOrderId);
          if (statusRes && statusRes.PaymentStatus === 'PAID') {
             setIsPolling(false);
             clearInterval(interval);
             
             saveCartState([]);
             setOrderNote('');
             setDeliveryAddress('');
             setIsCheckoutOpen(false);
             setPayOsQrCode('');
             setPayOsDetails(null);
             setActiveOrderId(null);
             
             toast.success('Thanh toán thành công! Phêla đã nhận được thanh toán và đơn hàng của bạn.');
             router.push('/history');
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, activeOrderId]);

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

  // Pagination logic
  const totalPages = Math.ceil(filteredDrinks.length / itemsPerPage);
  const paginatedDrinks = filteredDrinks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, sortOption, minPrice, maxPrice, minRating]);

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
                  {customer.MemberShipLevel?.LevelName || 'Đồng (Bronze)'} (-{customer.MemberShipLevel?.DiscountRate || 0}%)
                </Badge>
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="rounded-xl flex items-center gap-1.5 text-xs text-primary font-bold">
                    <History className="w-4 h-4" /> Lịch sử đơn
                  </Button>
                </Link>
                <VoucherWallet customerId={customer.CustomerID} />
                <Button onClick={() => setIsShareModalOpen(true)} variant="outline" size="sm" className="rounded-xl flex items-center gap-1.5 text-xs text-primary font-bold border-primary/20">
                  <Gift className="w-4 h-4" /> Chia sẻ & Nhận Quà
                </Button>
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
        


        {/* Left 2 cols: Menu list */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <ProductCatalog
            timeGreeting={timeGreeting}
            customer={customer}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            frequentOrders={frequentOrders}
            drinks={drinks}
            drinkSizes={drinkSizes}
            toppingsList={toppingsList}
            setSelectedDrink={setSelectedDrink}
            setSelectedSizeId={setSelectedSizeId}
            setSugarLevel={setSugarLevel}
            setIceLevel={setIceLevel}
            setSelectedToppings={setSelectedToppings as any}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOption={sortOption}
            setSortOption={setSortOption}
            minRating={minRating}
            setMinRating={setMinRating}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            isLoadingMenu={isLoadingMenu}
            filteredDrinks={filteredDrinks}
            paginatedDrinks={paginatedDrinks}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            handleOpenCustomize={handleOpenCustomize}
          />
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

            {comboSuggestions.length > 0 && cart.length > 0 && (
              <div className="pt-2 pb-2 border-t border-border/50">
                <h4 className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-primary" /> Gợi ý thêm cho bạn</h4>
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                  {comboSuggestions.map((combo, idx) => (
                    <div key={idx} className="flex-none w-[110px] border border-border/50 rounded-xl p-2 flex flex-col gap-1 items-center bg-muted/10 text-center hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => {
                      const drink = drinks.find(d => d.DrinkName === combo.DrinkName);
                      if (drink) {
                        setSelectedDrink(drink);
                        setSelectedSizeId(combo.DrinkSizeID);
                        setSugarLevel('100%');
                        setIceLevel('100%');
                        setSelectedToppings([]);
                      }
                    }}>
                      <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mb-1 overflow-hidden">
                        {combo.DrinkImageURL ? (
                          <img src={combo.DrinkImageURL} alt={combo.DrinkName} className="w-full h-full object-cover" />
                        ) : (
                          <Coffee className="w-4 h-4 text-muted-foreground/30" />
                        )}
                      </div>
                      <p className="text-[9px] font-bold leading-tight line-clamp-2 h-6">{combo.DrinkName} ({combo.SizeName})</p>
                      <p className="text-[9px] font-mono text-primary font-bold">{combo.UnitPrice.toLocaleString('vi-VN')}đ</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculations and Order Details form */}
            {cart.length > 0 && (
              <div className="border-t border-border/80 pt-4 space-y-4">
                
                {/* Voucher input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Mã giảm giá (nếu có)"
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

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tạm tính</span>
                    <span className="font-mono">{subtotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                  
                  {appliedVoucher && (
                    <div className="flex justify-between text-xs text-primary font-semibold">
                      <span>Voucher: {appliedVoucher.Code}</span>
                      <span className="font-mono">-{voucherDiscount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}

                  {promotionDiscount > 0 && (
                    <div className="flex justify-between text-xs text-primary font-semibold">
                      <span>Giảm giá Combo</span>
                      <span className="font-mono">- {promotionDiscount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}

                  {customer && (
                    <div className="flex justify-between text-xs text-primary font-semibold">
                      <span>Giảm giá Hội viên ({customer.MemberShipLevel?.DiscountRate || 0}%)</span>
                      <span className="font-mono">-{membershipDiscount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  {orderType === 'DELIVERY' && (
                    <div className="flex justify-between text-xs text-primary font-semibold">
                      <span>Phí giao hàng</span>
                      <span className="font-mono">{shippingFee > 0 ? `+ ${shippingFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border/30">
                    <span>Tổng thanh toán</span>
                    <span className="font-mono text-primary">{total.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Order Type Selection */}
                  <div className="flex bg-muted p-1 rounded-xl gap-1">
                    <button onClick={() => setOrderType('TAKEAWAY')} className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all ${orderType === 'TAKEAWAY' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>Mang đi</button>
                    <button onClick={() => setOrderType('DINE_IN')} className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all ${orderType === 'DINE_IN' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>Tại bàn</button>
                    <button onClick={() => setOrderType('DELIVERY')} className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all ${orderType === 'DELIVERY' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>Giao hàng</button>
                  </div>

                  {orderType === 'DINE_IN' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wide">Số bàn (Tại quầy)</label>
                      <select 
                        value={tableId}
                        onChange={(e)=>setTableId(parseInt(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                      >
                        <option value={0}>Chọn bàn...</option>
                        {tables.map(t => (
                          <option key={t.ShopTableID} value={t.ShopTableID}>Bàn {t.ShopTableNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {orderType === 'DELIVERY' && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Tỉnh / Thành</label>
                          <select 
                            className="w-full text-xs h-8 rounded-md border border-border bg-background px-2"
                            value={selectedProvinceId} 
                            onChange={(e) => setSelectedProvinceId(Number(e.target.value))}
                          >
                            <option value={0}>Chọn Tỉnh...</option>
                            {provinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Quận / Huyện</label>
                          <select 
                            className="w-full text-xs h-8 rounded-md border border-border bg-background px-2"
                            value={selectedDistrictId} 
                            onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
                            disabled={!selectedProvinceId}
                          >
                            <option value={0}>Chọn Quận...</option>
                            {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Phường / Xã</label>
                          <select 
                            className="w-full text-xs h-8 rounded-md border border-border bg-background px-2"
                            value={selectedWardCode} 
                            onChange={(e) => setSelectedWardCode(e.target.value)}
                            disabled={!selectedDistrictId}
                          >
                            <option value="">Chọn Phường...</option>
                            {wards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Số nhà, Tên đường *</label>
                        <Input 
                          placeholder="Số nhà, Tên đường..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Tên người nhận</label>
                          <Input 
                            placeholder={customer?.CustomerName || ''}
                            value={receiverName}
                            onChange={(e)=>setReceiverName(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">SĐT liên hệ</label>
                          <Input 
                            placeholder={customer?.PhoneNumber || ''}
                            value={receiverPhone}
                            onChange={(e)=>setReceiverPhone(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
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
                    if (orderType === 'DELIVERY' && !deliveryAddress) {
                      toast.error('Vui lòng cung cấp địa chỉ giao hàng.');
                      return;
                    }
                    if (orderType === 'DINE_IN' && tableId === 0) {
                      toast.error('Vui lòng chọn số bàn.');
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
      <CustomizeDialog
        selectedDrink={selectedDrink}
        setSelectedDrink={setSelectedDrink}
        drinkSizes={drinkSizes}
        selectedSizeId={selectedSizeId}
        setSelectedSizeId={setSelectedSizeId}
        sugarLevel={sugarLevel}
        setSugarLevel={setSugarLevel}
        iceLevel={iceLevel}
        setIceLevel={setIceLevel}
        toppingsList={toppingsList}
        selectedToppings={selectedToppings}
        toggleTopping={toggleTopping}
        drinks={drinks}
        getCurrentCustomPrice={getCurrentCustomPrice}
        handleAddToCart={handleAddToCart}
      />

      {/* B. Simulated Payment sheet dialog modal */}
      <CheckoutModal
        isCheckoutOpen={isCheckoutOpen}
        setIsCheckoutOpen={setIsCheckoutOpen}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        payOsQrCode={payOsQrCode}
        setPayOsQrCode={setPayOsQrCode}
        payOsDetails={payOsDetails}
        setPayOsDetails={setPayOsDetails}
        isPolling={isPolling}
        setIsPolling={setIsPolling}
        isSubmittingOrder={isSubmittingOrder}
        handlePlaceOrder={handlePlaceOrder}
        customer={customer}
        getTotalPrice={getTotalPrice}
      />

      {/* Referral Share Modal */}
      {isShareModalOpen && customer && (
        <Dialog
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title="Chia sẻ bạn bè, nhận ngay ưu đãi!"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Giới thiệu Phêla cho bạn bè chưa từng mua hàng để cả hai cùng nhận quà.</p>
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-center">
              <Gift className="w-12 h-12 text-primary mx-auto mb-2 animate-bounce" />
              <h3 className="font-bold text-foreground mb-1">Tặng 10% cho bạn & người ấy</h3>
              <p className="text-xs text-muted-foreground">Khi người bạn giới thiệu hoàn thành đơn hàng ĐẦU TIÊN, cả 2 sẽ nhận được Voucher giảm 10%.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Link chia sẻ của bạn</label>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${customer.CustomerID}`}
                  className="bg-muted font-mono text-xs flex-1"
                />
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${customer.CustomerID}`);
                    setCopiedLink(true);
                    toast.success('Đã copy link chia sẻ!');
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  variant="primary" 
                  className="px-3"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button 
              className="w-full font-bold uppercase tracking-wider text-xs flex items-center gap-2 justify-center"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Đăng ký Hội Viên Phêla',
                    text: 'Đăng ký tài khoản và nhận ưu đãi từ Phêla qua link giới thiệu của tôi!',
                    url: `${window.location.origin}/login?ref=${customer.CustomerID}`
                  }).catch(console.error);
                } else {
                  toast.error('Trình duyệt không hỗ trợ Web Share API. Vui lòng copy link.');
                }
              }}
            >
              <Share2 className="w-4 h-4" /> Chia sẻ qua Ứng dụng khác
            </Button>
          </div>
        </Dialog>
      )}


    </div>
  );
}
