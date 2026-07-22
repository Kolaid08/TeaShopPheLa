'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, CheckCircle2, Phone, LogOut, Package } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui/core';
import { api, Order, IngredientReceipt } from '@/lib/api';
import { toast } from 'sonner';

export default function ShipperDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [receipts, setReceipts] = useState<IngredientReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const [orderList, receiptList] = await Promise.all([
        api.getMyAssignedOrders(),
        api.getShipperReceipts(),
      ]);
      setOrders(orderList);
      setReceipts(receiptList);
    } catch {
      toast.error('Lỗi khi tải danh sách nhiệm vụ.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const user = api.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.Role !== 'SHIPPER' && user.Role !== 'ADMIN') {
      router.push('/');
      return;
    }
    loadTasks();
  }, [router]);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.updateOrderStatus(id, status);
      toast.success('Cập nhật trạng thái thành công!');
      loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật.');
    }
  };

  const handleUpdateReceiptStatus = async (id: number, status: 'CONFIRMED') => {
    try {
      await api.updateShipperReceiptStatus(id, status);
      toast.success('Đã nhận hàng nhập kho thành công!');
      loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật.');
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push('/login');
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-surface p-4 pb-24 font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif font-black text-2xl text-primary uppercase tracking-wide">Tài Xế Phêla</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Đơn hàng của bạn</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-xl">
          <LogOut className="w-4 h-4 mr-2" /> Thoát
        </Button>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground flex flex-col items-center justify-center">
            <Package className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-semibold text-sm">Chưa có đơn hàng nào cần giao.</p>
          </div>
        ) : (
          orders.map(order => (
            <Card key={order.OrderID} className="p-4 rounded-2xl border-border/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <Badge variant={order.OrderStatus === 'COMPLETED' ? 'success' : 'warning'}>
                  {order.OrderStatus === 'COMPLETED' ? 'Đã giao' : 'Đang giao'}
                </Badge>
              </div>
              <h3 className="font-mono font-bold text-lg text-primary mb-1">#{order.OrderID}</h3>
              
              <div className="space-y-3 mt-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  <span className="text-foreground font-medium">{order.ShippingAddress}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium">{order.ReceiverName || order.Customer?.CustomerName} - <span className="font-mono text-primary font-bold">{order.ReceiverPhone || order.Customer?.PhoneNumber}</span></span>
                </div>
                
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex justify-between items-center">
                  <span className="text-muted-foreground font-bold text-xs uppercase">Tiền thu hộ:</span>
                  <span className="font-mono text-lg font-black text-foreground">{order.TotalPrice.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {order.OrderStatus === 'SHIPPING' && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    className="rounded-xl font-bold text-primary border-primary/50 bg-primary/5"
                    onClick={() => {
                      const addr = order.ShippingAddress || 'Ho Chi Minh City';
                      window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank');
                    }}
                  >
                    <Navigation className="w-4 h-4 mr-2" /> Bản đồ
                  </Button>
                  <Button 
                    className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => handleUpdateStatus(order.OrderID, 'COMPLETED')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Đã giao xong
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}

        {receipts.length > 0 && receipts.map(receipt => (
          <Card key={`rec-${receipt.IngredientReceiptID}`} className="p-4 rounded-2xl border-indigo-200/60 shadow-sm relative overflow-hidden bg-indigo-50/10">
            <div className="absolute top-0 right-0 p-3">
              <Badge variant={receipt.IngredientReceiptStatus === 'CONFIRMED' ? 'success' : 'warning'}>
                {receipt.IngredientReceiptStatus === 'CONFIRMED' ? 'Đã lấy hàng' : 'Cần lấy hàng'}
              </Badge>
            </div>
            <h3 className="font-mono font-bold text-lg text-indigo-700 mb-1">NHẬP KHO #{receipt.IngredientReceiptID}</h3>
            
            <div className="space-y-3 mt-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                <span className="text-foreground font-medium">{receipt.ShippingAddress || 'Kho nhà cung cấp'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground font-medium">Đối tác: <span className="font-mono text-indigo-600 font-bold">{receipt.Supplier?.SupplierName}</span></span>
              </div>
            </div>

            {receipt.IngredientReceiptStatus === 'SHIPPING' && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold text-indigo-600 border-indigo-600/50 bg-indigo-600/5"
                  onClick={() => {
                    const lat = receipt.Latitude || 10.762622;
                    const lng = receipt.Longitude || 106.660172;
                    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" /> Bản đồ
                </Button>
                <Button 
                  className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => handleUpdateReceiptStatus(receipt.IngredientReceiptID, 'CONFIRMED')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Đã lấy & Giao kho
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
