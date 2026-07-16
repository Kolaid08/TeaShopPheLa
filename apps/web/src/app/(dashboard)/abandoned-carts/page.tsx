'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingCart, Clock, User, Gift, X } from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  Input
} from '@/components/ui/core';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Voucher modal state
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedCart, setSelectedCart] = useState<any>(null);
  const [discountValue, setDiscountValue] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCarts = async () => {
    try {
      const data = await api.getAbandonedCarts();
      setCarts(data);
    } catch {}
    setIsLoading(false);
  };

  const handleMockCarts = async () => {
    setIsLoading(true);
    try {
      await api.mockAbandonedCarts();
      toast.success('Đã giả lập đẩy lùi thời gian của các giỏ hàng thành công.');
      await loadCarts();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi giả lập giỏ hàng');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCarts();
  }, []);

  const handleOpenVoucherModal = (cart: any) => {
    setSelectedCart(cart);
    setDiscountValue(15);
    setIsVoucherModalOpen(true);
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCart || !selectedCart.CustomerID) {
      toast.error('Giỏ hàng này không thuộc về tài khoản khách hàng nào, không thể tặng mã trực tiếp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const code = `COMEBACK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await api.createVoucher({
        Code: code,
        DiscountType: 'PERCENT',
        DiscountValue: Number(discountValue),
        OwnerID: selectedCart.CustomerID,
        Creator: 'ADMIN',
        ValidUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days validity
      });

      toast.success(`Đã tạo và gửi mã ${code} cho khách hàng thành công!`);
      setIsVoucherModalOpen(false);
      // In a real app, you would also trigger an SMS/Email to the user here
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo mã giảm giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-destructive" />
            Giỏ Hàng Bị Bỏ Quên
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Danh sách khách hàng đang do dự. Hãy tạo mã giảm giá để chốt sale!
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleMockCarts} disabled={isLoading}>
          <Clock className="w-4 h-4 mr-2" />
          Giả lập bỏ quên (Test)
        </Button>
      </div>

      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải dữ liệu...
          </div>
        ) : carts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <ShoppingCart className="w-12 h-12 mb-4 text-muted-foreground/30" />
            <p>Tuyệt vời! Không có giỏ hàng nào bị bỏ quên.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-serif font-bold text-foreground">Khách Hàng</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Sản Phẩm Trong Giỏ</TableHead>
                <TableHead className="font-serif font-bold text-foreground text-center">Trạng Thái</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Cập Nhật Cuối</TableHead>
                <TableHead className="font-serif font-bold text-foreground text-right">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carts.map((cart) => (
                <TableRow key={cart.CartID} className="group">
                  <TableCell>
                    {cart.Customer ? (
                      <div>
                        <div className="font-bold flex items-center gap-1.5 text-sm">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {cart.Customer.CustomerName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {cart.Customer.PhoneNumber}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Khách vãng lai (Chưa ĐN)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {cart.CartItems.map((item: any) => (
                        <div key={item.CartItemID} className="text-xs">
                          <span className="font-semibold">{item.Quantity}x</span> {item.DrinkSize?.Drink?.DrinkName} ({item.DrinkSize?.Size?.SizeName})
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cart.Status === 'ABANDONED_NOTIFIED' ? 'success' : cart.Status === 'ABANDONED' ? 'danger' : 'warning'} className="text-[10px]">
                      {cart.Status === 'ABANDONED_NOTIFIED' ? 'Đã gửi mã tự động' : cart.Status === 'ABANDONED' ? 'Đã bỏ quên (>24h)' : 'Đang do dự'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(cart.updatedAt).toLocaleString('vi-VN')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {cart.Status !== 'ABANDONED_NOTIFIED' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8 text-xs font-bold border-primary text-primary hover:bg-primary/10 gap-1.5"
                        onClick={() => handleOpenVoucherModal(cart)}
                        disabled={!cart.CustomerID}
                      >
                        <Gift className="w-3.5 h-3.5" /> Tặng Mã
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Voucher Modal */}
      <Dialog
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Tạo Voucher Kéo Khách Trở Lại"
      >
        {selectedCart && (
          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div className="bg-muted p-3 rounded-xl mb-4">
              <p className="text-xs font-bold">Khách hàng: <span className="text-primary">{selectedCart.Customer?.CustomerName}</span></p>
              <p className="text-xs text-muted-foreground mt-1">SĐT: {selectedCart.Customer?.PhoneNumber}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Mức giảm giá (%)
              </label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min={1}
                max={100}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Mã sẽ có hiệu lực trong 3 ngày và được lưu trực tiếp vào tài khoản của khách.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVoucherModalOpen(false)}
                className="rounded-xl"
              >
                Hủy
              </Button>
              <Button type="submit" className="rounded-xl font-bold bg-primary text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Đang tạo...' : 'Tạo & Gửi Mã'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
