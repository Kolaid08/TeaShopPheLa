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
import dynamic from 'next/dynamic';
import AddressAutocomplete from '@/components/AddressAutocomplete';

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
  const [selectedToppings, setSelectedToppings] = useState<{ name: string; price: number }[]>([]);

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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  
  // Shipping states
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number>(0);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(0);
  const [selectedWardCode, setSelectedWardCode] = useState<string>('');
  
  // PayOS states
  const [payOsQrCode, setPayOsQrCode] = useState<string>('');
  const [payOsDetails, setPayOsDetails] = useState<{ accountNumber?: string; description?: string; bin?: string; amount?: number } | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Available options
  const toppingsList = [
    { name: 'Trân châu Hoàng Kim', price: 10000 },
    { name: 'Kem Phô Mai Phêla', price: 15000 },
    { name: 'Thạch Ô Long Giòn', price: 10000 },
  ];

  // Voucher states
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [comboSuggestions, setComboSuggestions] = useState<any[]>([]);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);

  useEffect(() => {
    api.getActivePromotions().then(setActivePromotions);
    api.getProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (selectedProvinceId) {
      api.getDistricts(selectedProvinceId).then(setDistricts);
      setSelectedDistrictId(0);
      setSelectedWardCode('');
      setWards([]);
      setShippingFee(0);
    }
  }, [selectedProvinceId]);

  useEffect(() => {
    if (selectedDistrictId) {
      api.getWards(selectedDistrictId).then(setWards);
      setSelectedWardCode('');
      setShippingFee(0);
    }
  }, [selectedDistrictId]);

  useEffect(() => {
    if (selectedDistrictId && selectedWardCode && cart.length > 0) {
      api.calculateFee({
        to_district_id: selectedDistrictId,
        to_ward_code: selectedWardCode,
        items: cart.map(c => ({ DrinkSizeID: c.DrinkSizeID, Quantity: c.Quantity }))
      }).then(res => setShippingFee(res.fee));
    } else {
      setShippingFee(0);
    }
  }, [selectedDistrictId, selectedWardCode, cart]);

  useEffect(() => {
    if (cart.length > 0) {
      const drinkSizeIds = cart.map(c => c.DrinkSizeID);
      api.getComboSuggestions(drinkSizeIds).then(setComboSuggestions);
    } else {
      setComboSuggestions([]);
    }
  }, [cart]);

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
    
    // shippingFee is now correctly handled by state `shippingFee` instead of manual distance calc
    const finalTotal = baseFinal + (orderType === 'DELIVERY' ? shippingFee : 0);
    
    return {
      subtotal,
      voucherDiscount: Math.floor(voucherDiscount),
      promotionDiscount: Math.floor(promotionDiscount),
      membershipDiscount: Math.floor(membershipDiscountAmount),
      shippingFee: orderType === 'DELIVERY' ? shippingFee : 0,
      total: Math.floor(finalTotal > 0 ? finalTotal : 0)
    };
  };

  const { subtotal, voucherDiscount, promotionDiscount, membershipDiscount, total } = getCalculations();
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

    setIsSubmittingOrder(true);
    try {
      let finalShippingAddress = deliveryAddress || undefined;

      if (orderType === 'DELIVERY') {
        if (!deliveryAddress || !selectedProvinceId || !selectedDistrictId || !selectedWardCode) {
          toast.error('Vui lòng nhập đầy đủ thông tin địa chỉ giao hàng (Tỉnh/Thành, Quận/Huyện, Phường/Xã)!');
          setIsSubmittingOrder(false);
          return;
        }
        if (!receiverName || !receiverPhone) {
          toast.error('Vui lòng nhập tên và số điện thoại người nhận!');
          setIsSubmittingOrder(false);
          return;
        }
        
        // Cần nối đầy đủ địa chỉ để GHN và Admin có thể xem được chính xác
        const pName = provinces.find(p => p.ProvinceID === selectedProvinceId)?.ProvinceName;
        const dName = districts.find(d => d.DistrictID === selectedDistrictId)?.DistrictName;
        const wName = wards.find(w => w.WardCode === selectedWardCode)?.WardName;
        
        let fullStr = deliveryAddress;
        if (wName && !fullStr.includes(wName)) fullStr += `, ${wName}`;
        if (dName && !fullStr.includes(dName)) fullStr += `, ${dName}`;
        if (pName && !fullStr.includes(pName)) fullStr += `, ${pName}`;
        finalShippingAddress = fullStr;
      }

      const orderPayload = {
        Items: cart.map((item) => ({
          DrinkSizeID: item.DrinkSizeID,
          Quantity: item.Quantity,
          Sugar: item.Sugar,
          Ice: item.Ice,
          Toppings: item.Toppings && item.Toppings.length > 0 ? item.Toppings.map(t => t.name).join(', ') : undefined,
          UnitPrice: Number(item.UnitPrice),
        })),
        TotalPrice: getTotalPrice(),
        ShopTableID: tableId > 0 ? tableId : undefined,
        OrderNote: `${deliveryAddress ? `Giao hàng: ${deliveryAddress}` : ''}${orderNote ? ` | Ghi chú: ${orderNote}` : ''}`,
        OrderType: orderType,
        ShippingAddress: finalShippingAddress,
        ProvinceID: selectedProvinceId || undefined,
        DistrictID: selectedDistrictId || undefined,
        WardCode: selectedWardCode || undefined,
        Latitude: latitude || undefined,
        Longitude: longitude || undefined,
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
      toast.error('Lỗi gửi đơn đặt hàng.');
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
                <Sparkles className="w-5 h-5 text-primary" /> {timeGreeting}{customer ? `, ${customer.CustomerName.split(' ').pop()}!` : '! Hôm nay uống gì?'}
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
          {/* Frequent Orders */}
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {paginatedDrinks.map((drink) => {
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl"
                  >
                    Trước
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          currentPage === i + 1 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl"
                  >
                    Sau
                  </Button>
                </div>
              )}
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
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Chi tiết Số nhà, Đường *</label>
                        <AddressAutocomplete 
                          initialValue={deliveryAddress}
                          onAddressSelect={(address: string, lat: number, lng: number) => {
                            setDeliveryAddress(address);
                            setLatitude(lat);
                            setLongitude(lng);
                          }}
                          onOpenMap={() => setIsMapModalOpen(true)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Tỉnh/Thành *</label>
                          <select 
                            value={selectedProvinceId} 
                            onChange={(e) => setSelectedProvinceId(Number(e.target.value))}
                            className="w-full text-xs h-8 rounded-lg border border-border bg-background px-2"
                          >
                            <option value={0}>Chọn Tỉnh</option>
                            {provinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Quận/Huyện *</label>
                          <select 
                            value={selectedDistrictId} 
                            onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
                            className="w-full text-xs h-8 rounded-lg border border-border bg-background px-2"
                            disabled={!selectedProvinceId}
                          >
                            <option value={0}>Chọn Quận</option>
                            {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Phường/Xã *</label>
                          <select 
                            value={selectedWardCode} 
                            onChange={(e) => setSelectedWardCode(e.target.value)}
                            className="w-full text-xs h-8 rounded-lg border border-border bg-background px-2"
                            disabled={!selectedDistrictId}
                          >
                            <option value="">Chọn Phường</option>
                            {wards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
                          </select>
                        </div>
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
                    if (orderType === 'DELIVERY' && (!deliveryAddress || !selectedProvinceId || !selectedDistrictId || !selectedWardCode)) {
                      toast.error('Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng (Tỉnh/Thành, Quận/Huyện, Phường/Xã và Chi tiết).');
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
                      if (sizes.length > 0) setSelectedSizeId(sizes[0]?.DrinkSizeID!);
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
                  <img src={payOsQrCode ? (payOsQrCode.startsWith('http') ? payOsQrCode : `https://quickchart.io/qr?text=${encodeURIComponent(payOsQrCode)}&size=200`) : `https://img.vietqr.io/image/mbbank-7414012005-compact2.png?amount=${getTotalPrice()}&addInfo=PHELA${customer?.PhoneNumber?.slice(-4) || '9999'}&accountName=NGUYEN%20VAN%20KHOA`} alt="VietQR" className="w-full h-full object-contain" />
                </div>
                <div className="text-xs space-y-1.5 flex-1">
                  {isPolling ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-2 py-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-bold text-primary animate-pulse">Đang chờ quét mã...</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-foreground">Thông tin chuyển khoản nhanh:</p>
                      <p>Ngân hàng: <span className="font-mono text-primary font-bold">{payOsDetails?.bin === '970422' ? 'MBBank' : (payOsDetails?.bin || 'MBBank')}</span></p>
                      <p>Số tài khoản: <span className="font-mono text-primary font-bold">{payOsDetails?.accountNumber || '7414012005'}</span></p>
                      <p>Chủ tài khoản: <span className="font-mono text-primary font-bold">NGUYEN VAN KHOA</span></p>
                      <p>Số tiền: <span className="font-mono text-primary font-bold">{(payOsDetails?.amount || getTotalPrice()).toLocaleString('vi-VN')} đ</span></p>
                      <p>Nội dung CK: <span className="font-mono text-primary font-bold">{payOsDetails?.description || `PHELA${customer?.PhoneNumber?.slice(-4) || '9999'}`}</span></p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 py-3.5 rounded-xl text-xs font-bold"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setIsPolling(false);
                  setPayOsQrCode('');
                  setPayOsDetails(null);
                }}
              >
                {isPolling ? 'Hủy giao dịch' : 'Hủy'}
              </Button>
              {!isPolling && (
                <Button 
                  className="flex-[2] py-3.5 rounded-xl text-xs font-bold text-white font-serif uppercase tracking-wider"
                  onClick={() => handlePlaceOrder(paymentMethod)}
                  disabled={isSubmittingOrder}
                >
                  {isSubmittingOrder ? 'Đang tạo đơn...' : 'Xác nhận Đơn hàng'}
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* C. Map Modal */}
      <Dialog 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="Chọn địa chỉ trên bản đồ"
      >
        <div className="space-y-4">
          <MapPicker 
            defaultLat={latitude || 10.762622}
            defaultLng={longitude || 106.660172}
            onLocationSelect={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Chi tiết số nhà, đường (Tùy chọn ghi thêm):</label>
            <Input 
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="VD: 155 Lê Quý Đôn..."
            />
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={() => {
              if (!latitude || !longitude) {
                toast.error('Vui lòng chọn vị trí trên bản đồ');
                return;
              }
              setIsMapModalOpen(false);
            }}
          >
            Xác nhận vị trí này
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
