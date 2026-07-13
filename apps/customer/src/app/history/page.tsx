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
  Ticket,
} from 'lucide-react';
import { Card, Button, Badge, Dialog } from '@/components/ui/core';
import { api, Order, Customer } from '@/lib/api';
import { toast } from 'sonner';

export default function HistoryPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review state
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewDrinkId, setReviewDrinkId] = useState<number | null>(null);
  const [reviewDrinkName, setReviewDrinkName] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Cancel state
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [refundBankCode, setRefundBankCode] = useState('');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [refundAccountName, setRefundAccountName] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    // Fetch bank list from vietqr for refund form
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => res.json())
      .then((data) => {
        if (data.code === '00' && data.data) {
          setBanks(data.data);
        }
      })
      .catch((err) => console.error('Failed to load banks:', err));
  }, []);

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

    if (active && active.PhoneNumber) {
      api.syncCustomerProfile(active.PhoneNumber).then((updatedCust) => {
        if (updatedCust) setCustomer(updatedCust);
      });
    }

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
  const handleReorder = async (order: Order) => {
    if (!order.OrderDetails || order.OrderDetails.length === 0) {
      toast.error('Không tìm thấy chi tiết món nước để mua lại.');
      return;
    }

    try {
      // Fetch latest drink sizes to check stock
      const allDrinkSizes = await api.getDrinkSizes();

      // Get existing cart items from LocalStorage
      const savedCart = localStorage.getItem('phela_customer_cart');
      let currentCart = savedCart ? JSON.parse(savedCart) : [];

      let skippedItems: string[] = [];

      // Map OrderDetails into CartItem structure
      order.OrderDetails.forEach((detail) => {
        const sizeInfo = allDrinkSizes.find((s: any) => s.DrinkSizeID === detail.DrinkSizeID);
        if (sizeInfo?.IsOutOfStock) {
          skippedItems.push(detail.DrinkSize?.Drink?.DrinkName || 'Món nước');
          return;
        }

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

      if (currentCart.length === (savedCart ? JSON.parse(savedCart).length : 0)) {
        toast.error('Tất cả món nước trong đơn cũ đều đã hết nguyên liệu, không thể mua lại.');
        return;
      }

      // Save updated cart
      localStorage.setItem('phela_customer_cart', JSON.stringify(currentCart));
      
      // Sync with backend
      api.syncCart(currentCart).catch(err => {
        console.error('Failed to sync cart to backend after reorder', err);
      });

      if (skippedItems.length > 0) {
        toast.warning(`Đã thêm vào giỏ. Đã bỏ qua: ${skippedItems.join(', ')} do hết nguyên liệu.`);
      } else {
        toast.success('Đã thêm các món nước từ đơn hàng cũ vào giỏ hàng.');
      }
      router.push('/'); // Navigate to shop menu
    } catch (err) {
      toast.error('Lỗi khi mua lại đơn hàng.');
    }
  };

  const handlePrintReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In Hóa Đơn #${order.OrderID}</title>
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
            <p style="margin:2px 0;">Số HĐ: #${order.OrderID}</p>
            <p style="margin:2px 0;">Ngày: ${new Date(order.CreatedTime || Date.now()).toLocaleString('vi-VN')}</p>
            ${customer ? `<p style="margin:2px 0;">Khách hàng: ${customer.CustomerName}</p>` : ''}
            ${order.ShopTable ? `<p style="margin:2px 0;">Bàn: ${order.ShopTable.ShopTableNumber}</p>` : ''}
            ${order.ShippingAddress ? `<p style="margin:2px 0;">Giao đến: ${order.ShippingAddress}</p>` : ''}
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
                ${order.OrderDetails?.map((item: any) => {
                  const itemTotal = item.UnitPrice * item.Quantity;
                  return `
                    <tr>
                      <td>
                        ${item.DrinkSize?.Drink?.DrinkName} (${item.DrinkSize?.Size?.SizeName})
                      </td>
                      <td class="center">${item.Quantity}</td>
                      <td class="right">${itemTotal.toLocaleString('vi-VN')}</td>
                    </tr>
                  `;
                }).join('') || ''}
              </tbody>
            </table>
            <div class="dashed"></div>
            <div class="flex bold" style="font-size: 16px; margin-top: 5px; padding-top: 5px;">
              <span>THÀNH TIỀN:</span><span>${order.TotalPrice.toLocaleString('vi-VN')}</span>
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

  const handleOpenReview = (order: Order, drinkId: number, drinkName: string) => {
    setReviewOrder(order);
    setReviewDrinkId(drinkId);
    setReviewDrinkName(drinkName);
    setRating(5);
    setComment('');
  };

  const submitReview = async () => {
    if (!reviewDrinkId || !customer || !reviewOrder) return;
    setIsSubmittingReview(true);
    try {
      await api.submitReview({
        DrinkID: reviewDrinkId,
        CustomerID: reviewOrder.CustomerID || customer.CustomerID,
        OrderID: reviewOrder.OrderID,
        Rating: rating,
        Comment: comment,
      });
      toast.success('Cảm ơn bạn đã đánh giá món uống!');
      setReviewOrder(null);
      // Update local state instantly so UI shows "Đã đánh giá"
      setOrders((prev) =>
        prev.map((o) => {
          if (o.OrderID === reviewOrder.OrderID) {
            return {
              ...o,
              Reviews: [...(o.Reviews || []), { DrinkID: reviewDrinkId, Rating: rating }],
            };
          }
          return o;
        })
      );
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gửi đánh giá.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openCancelModal = (order: Order) => {
    setCancelOrder(order);
    setRefundBankCode('');
    setRefundAccountNumber('');
    setRefundAccountName('');
  };

  const submitCancelOrder = async () => {
    if (!cancelOrder) return;
    
    let refundInfo = undefined;
    if (cancelOrder.PaymentStatus === 'PAID') {
      if (!refundBankCode || !refundAccountNumber || !refundAccountName) {
        toast.error('Vui lòng nhập đầy đủ thông tin ngân hàng để hoàn tiền.');
        return;
      }
      refundInfo = {
        RefundBankCode: refundBankCode,
        RefundAccountNumber: refundAccountNumber,
        RefundAccountName: refundAccountName,
      };
    }

    setIsCancelling(true);
    try {
      await api.cancelCustomerOrder(cancelOrder.OrderID, refundInfo);
      setOrders(prev => prev.map(o => o.OrderID === cancelOrder.OrderID ? { ...o, OrderStatus: 'CANCELLED', RefundStatus: refundInfo ? 'PENDING' : o.RefundStatus } : o));
      toast.success('Hủy đơn hàng thành công.');
      setCancelOrder(null);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hủy đơn hàng.');
    } finally {
      setIsCancelling(false);
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
          <p className="text-sm font-semibold text-muted-foreground">
            Đang tải lịch sử hóa đơn của bạn...
          </p>
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
              <h1 className="font-serif font-extrabold text-xl tracking-wider text-primary uppercase leading-tight">
                Phêla
              </h1>
              <span className="text-[9px] block text-muted-foreground font-semibold tracking-widest uppercase">
                Cửa hàng trực tuyến
              </span>
            </div>
          </Link>

          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl flex items-center gap-1.5 text-xs font-bold"
            >
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
              Bạn chưa mua cốc nước nào tại cửa hàng. Hãy quay lại trang chủ và khám phá đặc sản trà
              sữa Phêla nhé!
            </p>
            <Link href="/" className="mt-2">
              <Button
                size="sm"
                className="rounded-xl font-serif uppercase tracking-wider font-bold text-xs text-white"
              >
                Mua cốc nước đầu tiên
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const stepIndex = getStatusStepIndex(order.OrderStatus);

              return (
                <Card
                  key={order.OrderID}
                  className="p-6 hover:border-primary/30 transition-all duration-300"
                >
                  {/* Top info row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary text-base">
                          Hóa đơn #{order.OrderID}
                        </span>
                        {getStatusBadge(order.OrderStatus)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Đặt ngày: {new Date(order.CreatedTime).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Tổng tiền
                        </span>
                        <span className="font-mono font-black text-lg text-primary">
                          {order.TotalPrice.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order items listing */}
                  <div className="py-4 space-y-2.5">
                    {order.OrderDetails?.map((detail, idx) => {
                      const hasReviewed = order.Reviews?.some(r => r.DrinkID === (detail.DrinkSize as any)?.DrinkID);

                      return (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground">
                              {detail.DrinkSize?.Drink?.DrinkName || 'Trà Phêla'}
                            </span>
                            <span className="text-[10px] block font-mono text-muted-foreground">
                              Cỡ: {detail.DrinkSize?.Size?.SizeName || 'M'} x {detail.Quantity}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono font-semibold text-foreground">
                              {(detail.UnitPrice * detail.Quantity).toLocaleString('vi-VN')} đ
                            </span>
                            {order.OrderStatus === 'COMPLETED' && (detail.DrinkSize as any)?.DrinkID && (
                              hasReviewed ? (
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Đã đánh giá
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleOpenReview(
                                      order,
                                      (detail.DrinkSize as any)!.DrinkID,
                                      detail.DrinkSize!.Drink!.DrinkName,
                                    )
                                  }
                                  className="text-[10px] text-amber-600 font-bold hover:underline"
                                >
                                  Đánh giá món này
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {order.OrderNote && (
                      <div className="mt-3 p-3 bg-muted/40 rounded-xl border border-border/30 text-xs text-muted-foreground space-y-1">
                        <span className="font-bold text-[10px] uppercase text-foreground block">
                          Ghi chú & Tùy chọn:
                        </span>
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
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                              stepIndex >= 1
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                                : 'bg-background border-border text-muted-foreground'
                            }`}
                          >
                            1
                          </div>
                          <span
                            className={`text-[10px] font-bold ${stepIndex >= 1 ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            Đã nhận đơn
                          </span>
                        </div>

                        {/* Step 2: Preparing */}
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                              stepIndex >= 2
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                                : 'bg-background border-border text-muted-foreground'
                            }`}
                          >
                            2
                          </div>
                          <span
                            className={`text-[10px] font-bold ${stepIndex >= 2 ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            Đang pha chế
                          </span>
                        </div>

                        {/* Step 3: Completed */}
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                              stepIndex >= 3
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                                : 'bg-background border-border text-muted-foreground'
                            }`}
                          >
                            3
                          </div>
                          <span
                            className={`text-[10px] font-bold ${stepIndex >= 3 ? 'text-primary' : 'text-muted-foreground'}`}
                          >
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
                  <div className="pt-3 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{order.OrderType === 'DELIVERY' ? 'Giao hàng tận nơi' : 'Phục vụ tại bàn / mang đi'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {order.OrderStatus === 'PENDING' && (
                        <Button
                          onClick={() => openCancelModal(order)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs font-serif uppercase tracking-wider font-bold gap-1 border-red-500/40 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Hủy đơn
                        </Button>
                      )}
                      <Button
                        onClick={() => handlePrintReceipt(order)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-serif uppercase tracking-wider font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Ticket className="w-3.5 h-3.5" /> In PDF
                      </Button>
                      {order.RefundStatus === 'COMPLETED' && (
                        <div className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-xl flex items-center">
                          Đã hoàn tiền
                        </div>
                      )}
                      {order.RefundStatus === 'PENDING' && (
                        <div className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-xl flex items-center">
                          Đang chờ hoàn tiền
                        </div>
                      )}
                      <Button
                        onClick={() => handleReorder(order)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-serif uppercase tracking-wider font-bold gap-1 border-primary/40 hover:bg-primary hover:text-white"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Mua lại đơn này
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewOrder && (
        <Dialog
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          title="Đánh giá món uống"
        >
          <div className="space-y-4">
            <p className="text-sm font-semibold">
              Món: <span className="text-primary">{reviewDrinkName}</span>
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">
                Số sao đánh giá (1-5)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all ${rating >= star ? 'bg-amber-100 text-amber-500' : 'bg-muted text-muted-foreground'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Nhận xét của bạn</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Món này rất ngon, trà đậm vị..."
                className="w-full p-3 text-sm bg-muted/50 rounded-xl border border-border resize-none h-24"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setReviewOrder(null)}>
                Hủy
              </Button>
              <Button onClick={submitReview} disabled={isSubmittingReview}>
                {isSubmittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* CANCEL MODAL */}
      {cancelOrder && (
        <Dialog
          isOpen={!!cancelOrder}
          onClose={() => setCancelOrder(null)}
          title="Hủy đơn hàng"
        >
          <div className="space-y-4">
            <p className="text-sm font-medium">Bạn có chắc chắn muốn hủy đơn hàng #{cancelOrder?.OrderID}?</p>
            
            {cancelOrder?.PaymentStatus === 'PAID' && (
              <div className="bg-red-50 p-4 rounded-xl flex flex-col gap-3 border border-red-100 mt-2">
                <p className="text-xs text-red-600 font-semibold mb-1">
                  Đơn hàng đã được thanh toán. Vui lòng nhập thông tin tài khoản ngân hàng để nhận hoàn tiền:
                </p>
                <select
                  className="w-full text-sm border-b border-red-200 bg-transparent py-2 outline-none focus:border-red-500"
                  value={refundBankCode}
                  onChange={(e) => setRefundBankCode(e.target.value)}
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {banks.map((bank) => (
                    <option key={bank.bin} value={bank.bin}>
                      {bank.shortName} - {bank.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Số tài khoản"
                  className="w-full text-sm border-b border-red-200 bg-transparent py-2 outline-none focus:border-red-500"
                  value={refundAccountNumber}
                  onChange={(e) => setRefundAccountNumber(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Tên chủ tài khoản"
                  className="w-full text-sm border-b border-red-200 bg-transparent py-2 outline-none focus:border-red-500 uppercase"
                  value={refundAccountName}
                  onChange={(e) => setRefundAccountName(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setCancelOrder(null)} disabled={isCancelling}>
                Đóng
              </Button>
              <Button 
                onClick={submitCancelOrder} 
                disabled={isCancelling} 
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Xác nhận hủy
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
