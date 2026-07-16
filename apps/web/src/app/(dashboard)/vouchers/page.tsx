'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search, Ticket, Calendar, User } from 'lucide-react';
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
import { api, DrinkSize } from '@/lib/api';
import { toast } from 'sonner';

export default function VouchersManagement() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [drinkSizes, setDrinkSizes] = useState<DrinkSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState(10);
  const [targetProductId, setTargetProductId] = useState<number | ''>('');
  const [maxUsage, setMaxUsage] = useState(1);
  const [validUntil, setValidUntil] = useState('');

  const loadData = async () => {
    try {
      const [vList, dsList] = await Promise.all([api.getVouchers(), api.getDrinkSizes()]);
      setVouchers(vList);
      setDrinkSizes(dsList);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateForm = () => {
    setCode(`PHELA${Math.floor(Math.random() * 10000)}`);
    setDiscountType('PERCENT');
    setDiscountValue(10);
    setTargetProductId('');
    setMaxUsage(1);
    setValidUntil('');
    setIsFormOpen(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) {
      toast.error('Mã giảm giá và giá trị là bắt buộc.');
      return;
    }

    try {
      const payload = {
        Code: code,
        DiscountType: discountType,
        DiscountValue: Number(discountValue),
        TargetProductID: targetProductId ? Number(targetProductId) : undefined,
        MaxUsage: Number(maxUsage),
        ValidUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      };

      await api.createVoucher(payload);
      toast.success('Tạo mã giảm giá mới thành công!');
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo mã giảm giá.');
    }
  };

  const filteredVouchers = vouchers.filter(
    (v) =>
      v.Code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Quản Lý Mã Giảm Giá (Vouchers)
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Chương trình khuyến mãi và Marketing Phêla
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="w-4 h-4" /> Tạo mã giảm giá
        </Button>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm mã giảm giá..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-3 rounded-xl cafe-panel"
        />
      </div>

      {/* Table grid */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải dữ liệu voucher...
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Không tìm thấy voucher phù hợp.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-serif font-bold text-foreground">Mã Voucher</TableHead>
                <TableHead className="font-serif font-bold text-foreground text-center">Giảm Giá</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Áp Dụng Cho</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Tài Khoản</TableHead>
                <TableHead className="font-serif font-bold text-foreground text-center">Trạng Thái</TableHead>
                <TableHead className="font-serif font-bold text-foreground">Thời Hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.map((v) => (
                <TableRow key={v.VoucherID} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Ticket className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-bold text-primary font-mono">{v.Code}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          ID: #{v.VoucherID}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="warning" className="font-mono text-sm">
                      {v.DiscountType === 'PERCENT' ? `${v.DiscountValue}%` : `${v.DiscountValue.toLocaleString('vi-VN')}đ`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {v.DrinkSize ? (
                      <div>
                        <span className="font-semibold text-xs">{v.DrinkSize.Drink.DrinkName} ({v.DrinkSize.Size.SizeName})</span>
                        <span className="block text-[10px] text-muted-foreground">Khóa cứng sản phẩm</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Toàn bộ đơn hàng</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {v.Customer ? (
                      <div className="flex items-center gap-1 text-xs">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {v.Customer.CustomerName}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Mọi người dùng</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={v.UsedCount >= v.MaxUsage ? "neutral" : "success"}>
                      {v.UsedCount} / {v.MaxUsage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {v.ValidUntil ? (
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(v.ValidUntil).toLocaleDateString('vi-VN')}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Vô thời hạn</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Tạo Voucher Giảm Giá"
      >
        <form onSubmit={handleSaveVoucher} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Mã Voucher
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VD: KHUYENMAI2023..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Loại Giảm Giá
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Giá tiền (VNĐ)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Mức Giảm
              </label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min={0}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Khóa cứng cho Sản Phẩm (Tùy chọn)
            </label>
            <select
              value={targetProductId}
              onChange={(e) => setTargetProductId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Tất cả (Toàn bộ đơn hàng)</option>
              {drinkSizes.filter(ds => ds.DrinkSizeStatus === 'AVAILABLE').map((ds) => (
                <option key={ds.DrinkSizeID} value={ds.DrinkSizeID}>
                  {ds.Drink?.DrinkName} - {ds.Size?.SizeName}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Chọn nếu mã này chỉ áp dụng để giảm giá riêng biệt món uống này.</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Lượt Sử Dụng Tối Đa
            </label>
            <Input
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(Number(e.target.value))}
              min={1}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Ngày Hết Hạn (Tùy chọn)
            </label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button type="submit" className="rounded-xl font-bold bg-primary text-white">
              Tạo Voucher
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
