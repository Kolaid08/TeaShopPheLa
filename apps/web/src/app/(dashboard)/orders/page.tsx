'use client';

import React, { useEffect, useState } from 'react';
import { Search, Eye, Calendar, Coffee, Filter, CheckCircle2, XCircle, Play, Ticket } from 'lucide-react';
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
import { api, Order, Employee } from '@/lib/api';
import { toast } from 'sonner';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedShipperId, setSelectedShipperId] = useState<number>(0);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadOrders = async () => {
    try {
      const list = await api.getOrders();
      setOrders(list);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
    api.getEmployees().then(list => setEmployees(list.filter(e => e.Role?.RoleName === 'Shipper' || !e.Role || e.Role?.RoleName === 'STAFF'))).catch(() => {});
  }, []);

  const handleAssignShipper = async () => {
    if (!selectedOrder || !selectedShipperId) return;
    setIsAssigning(true);
    try {
      const res = await api.assignInternalShipper(selectedOrder.OrderID, selectedShipperId);
      toast.success('Đã điều phối nhân viên giao hàng thành công.');
      setSelectedOrder(res);
      loadOrders();
    } catch (err: any) {
      toast.error('Lỗi khi điều phối giao hàng: ' + (err.message || ''));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBookThirdParty = async () => {
    if (!selectedOrder) return;
    setIsAssigning(true);
    try {
      const res = await api.bookThirdPartyShipper(selectedOrder.OrderID);
      toast.success('Đã gọi thành công đơn vị vận chuyển thứ 3.');
      setSelectedOrder(res);
      loadOrders();
    } catch (err: any) {
      toast.error('Lỗi khi gọi vận chuyển thứ 3: ' + (err.message || ''));
    } finally {
      setIsAssigning(false);
    }
  };

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
            ${order.Customer ? `<p style="margin:2px 0;">Khách hàng: ${order.Customer.CustomerName}</p>` : ''}
            ${order.ShopTable ? `<p style="margin:2px 0;">Bàn: ${order.ShopTable.ShopTableNumber}</p>` : ''}
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

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
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
            <option value="COMPLETED">Đã hoàn thành (Completed)</option>
            <option value="CANCELLED">Đã hủy bỏ (Cancelled)</option>
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
                    {order.OrderType === 'DELIVERY' 
                      ? <Badge variant="neutral">Giao Hàng</Badge>
                      : order.ShopTable?.ShopTableNumber
                        ? `Bàn số ${order.ShopTable.ShopTableNumber}`
                        : 'Mang đi'
                    }
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
                          : order.OrderStatus === 'CANCELLED'
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
                      : selectedOrder.OrderStatus === 'CANCELLED'
                        ? 'danger'
                        : selectedOrder.OrderStatus === 'PREPARING'
                          ? 'warning'
                          : 'neutral'
                  }
                >
                  {selectedOrder.OrderStatus}
                </Badge>
              </div>
              
              {selectedOrder.OrderType === 'DELIVERY' && (
                <div className="mt-4 pt-3 border-t border-border/60 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary block">Thông tin giao hàng:</span>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Người nhận:</span>
                    <span className="font-bold text-foreground text-right">{selectedOrder.ReceiverName || selectedOrder.Customer?.CustomerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">SĐT nhận:</span>
                    <span className="font-mono text-foreground text-right">{selectedOrder.ReceiverPhone || selectedOrder.Customer?.PhoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Địa chỉ:</span>
                    <span className="text-foreground text-right flex-1 ml-4 text-[10px]">{selectedOrder.ShippingAddress}</span>
                  </div>
                  {selectedOrder.DeliveryMethod && (
                    <div className="flex justify-between mt-2 pt-2 border-t border-dashed border-border/50">
                      <span className="text-muted-foreground font-bold">ĐV Vận Chuyển:</span>
                      <span className="font-bold text-foreground">
                        {selectedOrder.DeliveryMethod === 'INTERNAL' ? 'Nhân viên quán' : 'Giao Hàng Nhanh (GHN)'}
                      </span>
                    </div>
                  )}
                  {selectedOrder.GHN_OrderCode && (
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground font-bold">Mã vận đơn:</span>
                      <a href={selectedOrder.TrackingURL} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">
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
                    Cập nhật / Điều phối:
                  </span>
                  
                  {selectedOrder.OrderType === 'DELIVERY' && selectedOrder.OrderStatus === 'PREPARING' && !selectedOrder.DeliveryMethod && (
                    <div className="p-3 border border-border/50 bg-muted/20 rounded-xl space-y-3 mb-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Điều phối giao hàng</p>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 text-xs rounded-lg border border-border bg-background px-2"
                          value={selectedShipperId}
                          onChange={(e)=>setSelectedShipperId(parseInt(e.target.value))}
                        >
                          <option value={0}>-- Chọn Shipper Nội Bộ --</option>
                          {employees.map(e => <option key={e.EmployeeID} value={e.EmployeeID}>{e.FullName}</option>)}
                        </select>
                        <Button size="sm" onClick={handleAssignShipper} disabled={isAssigning || !selectedShipperId}>Giao NV</Button>
                      </div>
                      <div className="text-center text-[10px] text-muted-foreground">- HOẶC -</div>
                      <Button variant="outline" className="w-full text-xs" onClick={handleBookThirdParty} disabled={isAssigning}>
                        Đẩy đơn GHN
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {selectedOrder.OrderStatus === 'PENDING' && (
                      <Button
                        className="flex-1 py-3 rounded-xl gap-1.5 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => handleUpdateStatus(selectedOrder.OrderID, 'PREPARING')}
                      >
                        <Play className="w-4 h-4" /> Pha chế
                      </Button>
                    )}
                    {selectedOrder.OrderStatus === 'PREPARING' && selectedOrder.OrderType !== 'DELIVERY' && (
                      <Button
                        className="flex-1 py-3 rounded-xl gap-1.5 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => handleUpdateStatus(selectedOrder.OrderID, 'COMPLETED')}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                      </Button>
                    )}
                    {selectedOrder.OrderStatus === 'SHIPPING' && selectedOrder.DeliveryMethod === 'THIRD_PARTY' && (
                      <Button
                        className="flex-1 py-3 rounded-xl gap-1.5 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => handleUpdateStatus(selectedOrder.OrderID, 'COMPLETED')}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Đã giao xong (3rd Party)
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

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 py-3 rounded-xl"
                onClick={() => setIsDetailOpen(false)}
              >
                Thoát chi tiết
              </Button>
              <Button
                className="flex-1 py-3 rounded-xl font-serif uppercase tracking-wider font-extrabold gap-2"
                onClick={() => handlePrintReceipt(selectedOrder)}
              >
                <Ticket className="w-4 h-4" /> In Hóa Đơn
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
