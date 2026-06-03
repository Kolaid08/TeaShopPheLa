'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Coffee,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MapPin,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
} from '@/components/ui/core';
import { api, Order, Customer } from '@/lib/api';
import { toast } from 'sonner';

export default function HistoryPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Authenticate check
    const active = api.getCurrentCustomer();
    if (!active && typeof window !== 'undefined') {
      const token = localStorage.getItem('phela_customer_token');
      if (!token) {
        router.push('/login');
        return;
      }
    }
    setCustomer(active);

    const loadOrderHistory = async () => {
      try {
        const historyList = await api.getCustomerOrders();
        setOrders(historyList);
      } catch (err) {
        toast.error('Lỗi khi tải lịch sử đơn hàng.');
      } finally {
        setIsLoading(false);
      }
    };

    if (active) {
      loadOrderHistory();
    }
  }, [router]);

  // Handle re-ordering (Add items from past order to cart)
  const handleReorder = (order: Order) => {
    if (!order.OrderDetails || order.OrderDetails.length === 0) {
      toast.error('Không tìm thấy chi tiết món nước để mua lại.');
      return;
    }

    try {
      // Get existing cart items from LocalStorage
      const savedCart = localStorage.getItem('phela_customer_cart');
      let currentCart = savedCart ? JSON.parse(savedCart) : [];

      // Map OrderDetails into CartItem structure
      order.OrderDetails.forEach((detail) => {
        const sugar = '100%'; // Default levels
        const ice = '100%';
        const toppings: { name: string; price: number }[] = [];
        
        // Generate unique key
        const itemKey = `${detail.DrinkSizeID}-${sugar}-${ice}-`;

        // Check if item already exists in cart
        const existingIdx = currentCart.findIndex((item: any) => item.id === itemKey);
        if (existingIdx !== -1) {
          currentCart[existingIdx].Quantity += detail.Quantity;
        } else {
          currentCart.push({
            id: itemKey,
            DrinkSizeID: detail.DrinkSizeID,
            DrinkName: detail.DrinkSize?.Drink?.DrinkName || 'Trà Phêla',
            SizeName: detail.DrinkSize?.Size?.SizeName || 'M',
            UnitPrice: detail.UnitPrice,
            Quantity: detail.Quantity,
            Sugar: sugar,
            Ice: ice,
            Toppings: toppings,
          });
        }
      });

      // Save updated cart
      localStorage.setItem('phela_customer_cart', JSON.stringify(currentCart));
      toast.success('Đã thêm các món nước từ đơn hàng cũ vào giỏ hàng.');
      router.push('/'); // Navigate to shop menu
    } catch (err) {
      toast.error('Lỗi khi mua lại đơn hàng.');
    }
  };

  const getStatusBadge = (status: Order['OrderStatus']) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="neutral">Chờ xác nhận</Badge>;
      case 'PREPARING':
        return <Badge variant="warning">Đang chế biến</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Hoàn thành</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Đã hủy bỏ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusStepIndex = (status: Order['OrderStatus']) => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'PREPARING':
        return 2;
      case 'COMPLETED':
        return 3;
      case 'CANCELLED':
        return -1; // cancelled state
      default:
        return 1;
    }
  };

  if (isLoading || !customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">Đang tải lịch sử hóa đơn của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Coffee className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="font-serif font-extrabold text-xl tracking-wider text-primary uppercase leading-tight">Phêla</h1>
              <span className="text-[9px] block text-muted-foreground font-semibold tracking-widest uppercase">Cửa hàng trực tuyến</span>
            </div>
          </Link>

          <Link href="/">
            <Button variant="outline" size="sm" className="rounded-xl flex items-center gap-1.5 text-xs font-bold">
              <ArrowLeft className="w-4 h-4" /> Quay lại menu
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Order History body */}
      <main className="flex-1 container max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="font-serif font-black text-2xl md:text-3xl text-foreground tracking-tight flex items-center gap-2">
            Lịch sử mua hàng
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-0.5">
            Xem trạng thái đơn hàng thời gian thực của hội viên {customer.CustomerName}
          </p>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
            <p className="font-serif font-black text-lg">Bạn chưa đặt đơn hàng nào</p>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              Bạn chưa mua cốc nước nào tại cửa hàng. Hãy quay lại trang chủ và khám phá đặc sản trà sữa Phêla nhé!
            </p>
            <Link href="/" className="mt-2">
              <Button size="sm" className="rounded-xl font-serif uppercase tracking-wider font-bold text-xs text-white">
                Mua cốc nước đầu tiên
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const stepIndex = getStatusStepIndex(order.OrderStatus);
              
              return (
                <Card key={order.OrderID} className="p-6 hover:border-primary/30 transition-all duration-300">
                  {/* Top info row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary text-base">Hóa đơn #{order.OrderID}</span>
                        {getStatusBadge(order.OrderStatus)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Đặt ngày: {new Date(order.CreatedTime).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Tổng tiền</span>
                        <span className="font-mono font-black text-lg text-primary">{order.TotalPrice.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>

                  {/* Order items listing */}
                  <div className="py-4 space-y-2.5">
                    {order.OrderDetails?.map((detail, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground">
                            {detail.DrinkSize?.Drink?.DrinkName || 'Trà Phêla'}
                          </span>
                          <span className="text-[10px] block font-mono text-muted-foreground">
                            Cỡ: {detail.DrinkSize?.Size?.SizeName || 'M'} x {detail.Quantity}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-foreground">
                          {(detail.UnitPrice * detail.Quantity).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    ))}
                    
                    {order.OrderNote && (
                      <div className="mt-3 p-3 bg-muted/40 rounded-xl border border-border/30 text-xs text-muted-foreground space-y-1">
                        <span className="font-bold text-[10px] uppercase text-foreground block">Ghi chú & Tùy chọn:</span>
                        <p className="leading-relaxed">{order.OrderNote}</p>
                      </div>
                    )}
                  </div>

                  {/* Progress tracker stepper bar */}
                  {stepIndex !== -1 ? (
                    <div className="py-5 border-t border-b border-border/40 my-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-3.5">
                        Tiến trình đơn hàng:
                      </span>
                      
                      <div className="relative flex items-center justify-between w-full max-w-md mx-auto">
                        {/* Connecting Line background */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted rounded" />
                        
                        {/* Active line fill */}
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded transition-all duration-500" 
                          style={{ width: `${(stepIndex - 1) * 50}%` }}
                        />

                        {/* Step 1: Pending */}
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                            stepIndex >= 1 
                              ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                              : 'bg-background border-border text-muted-foreground'
                          }`}>
                            1
                          </div>
                          <span className={`text-[10px] font-bold ${stepIndex >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                            Đã nhận đơn
                          </span>
                        </div>

                        {/* Step 2: Preparing */}
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                            stepIndex >= 2 
                              ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                              : 'bg-background border-border text-muted-foreground'
                          }`}>
                            2
                          </div>
                          <span className={`text-[10px] font-bold ${stepIndex >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                            Đang pha chế
                          </span>
                        </div>

                        {/* Step 3: Completed */}
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                            stepIndex >= 3 
                              ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                              : 'bg-background border-border text-muted-foreground'
                          }`}>
                            3
                          </div>
                          <span className={`text-[10px] font-bold ${stepIndex >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                            Đã phục vụ
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-2 text-xs text-red-600 font-semibold my-3">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Đơn hàng đã bị hủy bỏ hoặc từ chối tại quầy lễ tân Phêla.</span>
                    </div>
                  )}

                  {/* Re-order action button row */}
                  <div className="pt-3 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Phục vụ tại bàn / mang đi</span>
                    </div>
                    <Button 
                      onClick={() => handleReorder(order)}
                      size="sm" 
                      variant="outline" 
                      className="rounded-xl text-xs font-serif uppercase tracking-wider font-bold gap-1 border-primary/40 hover:bg-primary hover:text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Mua lại đơn này
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
