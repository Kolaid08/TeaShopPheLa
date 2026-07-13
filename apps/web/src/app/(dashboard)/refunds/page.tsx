'use client';

import React, { useEffect, useState } from 'react';
import { Search, RotateCcw, CheckCircle2, Eye, Building, Hash, User } from 'lucide-react';
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

export default function RefundsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRefunds = async () => {
    try {
      const list = await api.getPendingRefunds();
      setOrders(list);
    } catch {
      toast.error('Lỗi khi tải danh sách hoàn tiền.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const handleMarkAsRefunded = async (id: number) => {
    if (!confirm(`Bạn đã chuyển khoản hoàn tiền cho Đơn hàng #${id} và muốn xác nhận hoàn tất?`)) return;
    setIsProcessing(true);
    try {
      await api.markAsRefunded(id);
      toast.success(`Đã xác nhận hoàn tiền cho đơn hàng #${id}`);
      loadRefunds();
      setIsDetailOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật hoàn tiền.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchId = o.OrderID.toString().includes(term);
    const matchCus = o.Customer?.CustomerName.toLowerCase().includes(term) || false;
    const matchPhone = o.Customer?.PhoneNumber.includes(term) || false;
    return matchId || matchCus || matchPhone;
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-2">
            <RotateCcw className="w-8 h-8" /> Yêu Cầu Hoàn Tiền
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý các đơn hàng đã thanh toán nhưng bị hủy</p>
        </div>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-primary/20 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            className="pl-9 bg-background border-primary/20 focus:border-primary w-full"
            placeholder="Tìm theo Mã ĐH, Tên KH, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Mã ĐH</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngân hàng nhận</TableHead>
                <TableHead>Số tiền cần hoàn</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p>Đang tải danh sách hoàn tiền...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Không có yêu cầu hoàn tiền nào đang chờ xử lý.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.OrderID} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono font-medium">#{order.OrderID}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{order.Customer?.CustomerName || 'Khách lẻ'}</span>
                        <span className="text-xs text-muted-foreground">{order.Customer?.PhoneNumber || ''}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary">{order.RefundBankCode || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{order.RefundAccountNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-red-600">
                        {order.TotalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate max-w-[150px] inline-block">
                        {order.RefundReason || 'Khách yêu cầu hủy'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailOpen(true);
                          }}
                          className="hover:bg-primary hover:text-primary-foreground border-primary/20 text-primary"
                        >
                          <Eye className="w-4 h-4 mr-1" /> Chi tiết
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsRefunded(order.OrderID)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Đã CK
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Hoàn tiền Hóa Đơn #${selectedOrder?.OrderID}`}>
        {selectedOrder && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-3">
                <h3 className="text-blue-800 font-bold flex items-center gap-2 border-b border-blue-200 pb-2">
                  <RotateCcw className="w-5 h-5" /> Thông tin nhận tiền của khách
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Building className="w-4 h-4"/> Ngân hàng:</span>
                    <span className="font-bold text-foreground">{selectedOrder.RefundBankCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-4 h-4"/> Số tài khoản:</span>
                    <span className="font-bold text-lg text-primary">{selectedOrder.RefundAccountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4"/> Tên chủ TK:</span>
                    <span className="font-bold text-foreground uppercase">{selectedOrder.RefundAccountName}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200/50">
                    <span className="text-blue-800 font-bold">Số tiền cần chuyển:</span>
                    <span className="font-black text-xl text-blue-700">{selectedOrder.TotalPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center bg-white p-3 rounded-lg border border-blue-200 shadow-sm min-w-[200px]">
                <p className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Quét mã để chuyển nhanh</p>
                <img 
                  src={`https://img.vietqr.io/image/${selectedOrder.RefundBankCode}-${selectedOrder.RefundAccountNumber}-compact2.png?amount=${selectedOrder.TotalPrice}&addInfo=Hoan tien DH ${selectedOrder.OrderID}&accountName=${encodeURIComponent(selectedOrder.RefundAccountName || '')}`} 
                  alt="VietQR" 
                  className="w-40 h-40 object-contain"
                />
              </div>
            </div>

            <div className="text-sm">
              <h4 className="font-semibold mb-2">Lý do hủy đơn:</h4>
              <p className="bg-muted p-3 rounded-lg">{selectedOrder.RefundReason || 'Khách yêu cầu hủy'}</p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button className="flex-1 rounded-xl bg-green-600 hover:bg-green-700" onClick={() => handleMarkAsRefunded(selectedOrder.OrderID)} disabled={isProcessing}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Xác nhận đã chuyển khoản
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
