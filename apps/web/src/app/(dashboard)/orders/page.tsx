'use client';

import React, { useEffect, useState } from 'react';
import { Search, Eye, Calendar, Coffee, Filter, CheckCircle2, XCircle, Play } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  Badge,
  Dialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/core';
import { api, Order } from '@/lib/api';
import { toast } from 'sonner';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Refund modal states
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');

  const loadOrders = async () => {
    try {
      const list = await api.getOrders();
      setOrders(list);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await api.updateOrderStatus(id, newStatus);
      toast.success(`Hóa đơn #${id} đã chuyển trạng thái sang ${newStatus}`);
      loadOrders(); // reload

      // Update selected detail modal view if active
      if (selectedOrder && selectedOrder.OrderID === id) {
        setSelectedOrder((prev) => (prev ? { ...prev, OrderStatus: newStatus as any } : null));
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái hóa đơn.');
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleRefundSubmit = async () => {
    if (!selectedOrder) return;
    try {
      await api.refundOrder(selectedOrder.OrderID, refundAmount, refundReason);
      toast.success(`Đã hoàn tiền ${refundAmount.toLocaleString('vi-VN')} đ cho đơn hàng #${selectedOrder.OrderID}`);
      setIsRefundOpen(false);
      loadOrders();
      // Update selected order view
      setSelectedOrder((prev) => (prev ? { ...prev, RefundStatus: 'PARTIAL', RefundAmount: refundAmount, RefundReason: refundReason, OrderStatus: 'CANCELLED' } : null));
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hoàn tiền hóa đơn.');
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const custName = o.Customer?.CustomerName || '';
    const phone = o.Customer?.PhoneNumber || '';
    const matchSearch =
      custName.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
    const matchStatus = statusFilter === 'ALL' || o.OrderStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="border-b border-border/60 pb-4">
        <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
          Sổ Hóa Đơn & Đơn Hàng
        </h2>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
          Lịch sử giao dịch POS và Rota pha chế
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo Hội viên hoặc Số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-3 rounded-xl cafe-panel"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground uppercase tracking-wider cafe-panel focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý (Pending)</option>
            <option value="PREPARING">Đang pha chế (Preparing)</option>
            <option value="SHIPPING">Đang giao hàng (Shipping)</option>
            <option value="COMPLETED">Đã hoàn thành (Completed)</option>
            <option value="CANCELLED">Đã hủy bỏ (Cancelled)</option>
            <option value="DELIVERY_FAILED">Giao thất bại (Failed)</option>
          </select>
        </div>
      </div>

      {/* Orders Table list */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải hóa đơn...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Coffee className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-semibold text-sm">Không tìm thấy hóa đơn nào phù hợp.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã HĐ</TableHead>
                <TableHead>Khách Hàng</TableHead>
                <TableHead>Bàn Phục Vụ</TableHead>
                <TableHead>Thời Gian</TableHead>
                <TableHead>Tổng Giá</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.OrderID}
                  className="cursor-pointer"
                  onClick={() => openOrderDetail(order)}
                >
                  <TableCell className="font-mono font-bold text-xs text-primary">
                    #{order.OrderID}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">
                      {order.Customer?.CustomerName || 'Vãng lai'}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {order.Customer?.PhoneNumber || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {order.DeliveryType === 'DELIVERY'
                      ? <Badge variant="warning">Giao hàng GHN</Badge>
                      : order.ShopTable?.ShopTableNumber
                        ? `Bàn số ${order.ShopTable.ShopTableNumber}`
                        : 'Mang đi'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(order.CreatedTime).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell className="font-bold font-mono text-foreground">
                    {order.TotalPrice.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.OrderStatus === 'COMPLETED'
                          ? 'success'
                          : order.OrderStatus === 'CANCELLED' || order.OrderStatus === 'DELIVERY_FAILED'
                            ? 'danger'
                            : order.OrderStatus === 'PREPARING'
                              ? 'warning'
                              : 'neutral'
                      }
                    >
                      {order.OrderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl flex items-center gap-1 text-xs"
                      onClick={() => openOrderDetail(order)}
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Order Details dialog sheet */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Chi tiết đơn hàng #${selectedOrder?.OrderID}`}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-surface text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">Khách hàng:</span>
                <span className="font-bold text-foreground">
                  {selectedOrder.Customer?.CustomerName || 'Khách vãng lai'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">Số điện thoại:</span>
                <span className="font-mono text-foreground">
                  {selectedOrder.Customer?.PhoneNumber || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">Nhân viên phục vụ:</span>
                <span className="font-bold text-foreground">
                  {selectedOrder.Employee?.FullName || 'Hệ thống'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">Ngày lập:</span>
                <span className="font-mono text-foreground">
                  {new Date(selectedOrder.CreatedTime).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Trạng thái:</span>
                <Badge
                  variant={
                    selectedOrder.OrderStatus === 'COMPLETED'
                      ? 'success'
                      : selectedOrder.OrderStatus === 'CANCELLED' || selectedOrder.OrderStatus === 'DELIVERY_FAILED'
                        ? 'danger'
                        : selectedOrder.OrderStatus === 'PREPARING'
                          ? 'warning'
                          : 'neutral'
                  }
                >
                  {selectedOrder.OrderStatus}
                </Badge>
              </div>

              {selectedOrder.RefundStatus && selectedOrder.RefundStatus !== 'NONE' && (
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground font-bold">Hoàn tiền:</span>
                  <div className="text-right">
                    <Badge variant={selectedOrder.RefundStatus === 'FULL' || selectedOrder.RefundStatus === 'PARTIAL' ? 'success' : 'warning'}>
                      {selectedOrder.RefundStatus === 'REQUESTED' ? 'Đang yêu cầu' : selectedOrder.RefundStatus === 'PARTIAL' ? 'Một phần' : 'Toàn bộ'}
                    </Badge>
                    {(selectedOrder.RefundAmount || 0) > 0 && (
                      <div className="text-[10px] font-mono font-bold mt-1 text-danger">
                        -{Number(selectedOrder.RefundAmount).toLocaleString('vi-VN')} đ
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Thông tin GHN nếu có */}
              {selectedOrder.DeliveryType === 'DELIVERY' && (
                <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                  <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    Thông tin Giao Hàng Nhanh
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold text-[10px] uppercase">Người nhận:</span>
                    <span className="font-bold text-foreground text-xs">{selectedOrder.RecipientName || 'N/A'} - <span className="font-mono">{selectedOrder.RecipientPhone || 'N/A'}</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold text-[10px] uppercase">Địa chỉ:</span>
                    <span className="font-semibold text-foreground text-xs text-right max-w-[200px] leading-tight">{selectedOrder.DeliveryAddress || 'N/A'}</span>
                  </div>
                  {selectedOrder.GHN_OrderCode && (
                    <div className="flex justify-between items-center pt-1 border-t border-amber-500/20">
                      <span className="text-muted-foreground font-bold text-[10px] uppercase">Mã vận đơn:</span>
                      <a href={`https://donhang.ghn.vn/?order_code=${selectedOrder.GHN_OrderCode}`} target="_blank" rel="noreferrer" className="font-mono text-amber-600 font-bold text-xs underline hover:text-amber-700">
                        {selectedOrder.GHN_OrderCode}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items breakdown list */}
            <div>
              <h4 className="text-xs uppercase tracking-widest font-extrabold text-muted-foreground mb-3">
                Sản phẩm trà Oolong:
              </h4>
              <div className="divide-y divide-border border border-border rounded-xl bg-background/40 p-2.5 space-y-2 text-xs">
                {selectedOrder.OrderDetails?.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2.5">
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {item.DrinkSize?.Drink?.DrinkName || 'Sản phẩm trà Phêla'}
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md uppercase font-bold">
                          Size: {item.DrinkSize?.Size?.SizeName || 'N/A'} x {item.Quantity}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground font-mono">
                        {(item.Sugar || item.Ice || item.Toppings) ? (
                          <>
                            {item.Sugar && <span className="border border-border rounded px-1">Đường {item.Sugar}</span>}
                            {item.Ice && <span className="border border-border rounded px-1">Đá {item.Ice}</span>}
                            {item.Toppings && <span className="border border-border rounded px-1">+ {item.Toppings}</span>}
                          </>
                        ) : (
                          <span className="italic">Không có tùy chỉnh</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold font-mono text-foreground">
                      {(item.UnitPrice * item.Quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-dashed border-border pt-3 text-sm font-black text-foreground">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-primary font-mono">
                    {selectedOrder.TotalPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Action transition status triggers */}
            {selectedOrder.OrderStatus !== 'COMPLETED' &&
              selectedOrder.OrderStatus !== 'CANCELLED' && (
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block text-center">
                    Cập nhật pha chế:
                  </span>
                  <div className="flex gap-2">
                    {selectedOrder.OrderStatus === 'PENDING' && (
                      <Button
                        className="flex-1 py-3 rounded-xl gap-1.5 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => handleUpdateStatus(selectedOrder.OrderID, 'PREPARING')}
                      >
                        <Play className="w-4 h-4" /> Pha chế
                      </Button>
                    )}
                    {selectedOrder.OrderStatus === 'PREPARING' && (
                      <Button
                        className="flex-1 py-3 rounded-xl gap-1.5 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => handleUpdateStatus(selectedOrder.OrderID, 'COMPLETED')}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      className="flex-1 py-3 rounded-xl gap-1.5 flex items-center justify-center text-white"
                      onClick={() => handleUpdateStatus(selectedOrder.OrderID, 'CANCELLED')}
                    >
                      <XCircle className="w-4 h-4" /> Hủy đơn
                    </Button>
                  </div>
                </div>
              )}

            {/* Refund Action Trigger */}
            {(selectedOrder.OrderStatus === 'CANCELLED' || selectedOrder.OrderStatus === 'COMPLETED') &&
              (!selectedOrder.RefundStatus || selectedOrder.RefundStatus === 'NONE' || selectedOrder.RefundStatus === 'REQUESTED') && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full py-3 rounded-xl border-amber-500/50 text-amber-600 hover:bg-amber-50"
                    onClick={() => {
                      setRefundAmount(selectedOrder.TotalPrice);
                      setRefundReason(selectedOrder.RefundStatus === 'REQUESTED' ? 'Khách hàng yêu cầu hủy đơn' : '');
                      setIsRefundOpen(true);
                    }}
                  >
                    Hoàn tiền (Refund)
                  </Button>
                </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="w-full py-3 rounded-xl"
                onClick={() => setIsDetailOpen(false)}
              >
                Thoát chi tiết
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Refund Modal */}
      <Dialog
        isOpen={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        title="Thực hiện Hoàn Tiền"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bạn đang thực hiện thủ tục hoàn tiền cho hóa đơn #{selectedOrder?.OrderID}. 
            Vui lòng thực hiện chuyển khoản tay cho khách trước khi xác nhận trên hệ thống.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Số tiền hoàn (VNĐ)</label>
            <Input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              placeholder="VD: 55000"
            />
            <p className="text-[10px] text-muted-foreground font-mono italic">
              * Tổng tiền hóa đơn gốc: {selectedOrder?.TotalPrice.toLocaleString('vi-VN')} đ
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Lý do hoàn tiền</label>
            <Input
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Khách đổi ý, hết nguyên liệu..."
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsRefundOpen(false)}>Hủy bỏ</Button>
            <Button variant="danger" onClick={handleRefundSubmit}>Xác nhận Hoàn tiền</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
