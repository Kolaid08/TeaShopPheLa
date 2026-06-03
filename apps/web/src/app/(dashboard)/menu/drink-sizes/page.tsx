'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash, DollarSign } from 'lucide-react';
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
import { api, DrinkSize, Drink, Size } from '@/lib/api';
import { toast } from 'sonner';

export default function DrinkSizesMatrix() {
  const [drinkSizes, setDrinkSizes] = useState<DrinkSize[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDS, setSelectedDS] = useState<DrinkSize | null>(null);
  const [selectedDrinkId, setSelectedDrinkId] = useState(0);
  const [selectedSizeId, setSelectedSizeId] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);

  const loadMatrix = async () => {
    try {
      const [dsList, dList, sList] = await Promise.all([
        api.getDrinkSizes(),
        api.getDrinks(),
        api.getSizes(),
      ]);
      setDrinkSizes(dsList);
      setDrinks(dList);
      setSizes(sList);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const openCreateForm = () => {
    setSelectedDS(null);
    setSelectedDrinkId(drinks[0]?.DrinkID || 0);
    setSelectedSizeId(sizes[0]?.SizeID || 0);
    setUnitPrice(45000);
    setIsFormOpen(true);
  };

  const openUpdateForm = (ds: DrinkSize) => {
    setSelectedDS(ds);
    setSelectedDrinkId(ds.DrinkID);
    setSelectedSizeId(ds.SizeID);
    setUnitPrice(ds.UnitPrice);
    setIsFormOpen(true);
  };

  const handleSaveMatrix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrinkId || !selectedSizeId || !unitPrice) {
      toast.error('Vui lòng điền đầy đủ các trường thông tin.');
      return;
    }

    try {
      const payload = {
        DrinkID: selectedDrinkId,
        SizeID: selectedSizeId,
        UnitPrice: unitPrice,
      };

      if (selectedDS) {
        await api.updateDrinkSize(selectedDS.DrinkSizeID, payload);
        toast.success('Cập nhật đơn giá bán thành công!');
      } else {
        await api.createDrinkSize(payload);
        toast.success('Thêm mới liên kết kích cỡ & giá bán thành công!');
      }
      setIsFormOpen(false);
      loadMatrix();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu bảng giá.');
    }
  };

  const handleDeleteMatrix = async (id: number) => {
    if (!confirm('Bạn có muốn xóa đơn giá của mục size này?')) return;
    try {
      await api.deleteDrinkSize(id);
      toast.success('Đã gỡ đơn giá của size đồ uống.');
      loadMatrix();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa đơn giá.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Ma Trận Đơn Giá (Drink Sizes)
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Cấu hình đơn giá bán lẻ cho từng loại đồ uống và kích cỡ ly Phêla
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Khai báo giá bán mới
        </Button>
      </div>

      {/* Pricing Matrix Table */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải ma trận bảng giá...
          </div>
        ) : drinkSizes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Chưa có bảng giá đồ uống nào được định nghĩa. Hãy thêm mới ngay.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Đồ Uống</TableHead>
                <TableHead>Kích Cỡ Ly</TableHead>
                <TableHead>Thể Tích (ML)</TableHead>
                <TableHead>Giá Bán Lẻ</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drinkSizes.map((ds) => (
                <TableRow key={ds.DrinkSizeID}>
                  <TableCell className="font-serif font-bold text-base text-foreground tracking-tight">
                    {ds.Drink?.DrinkName || 'Sản phẩm Phêla'}
                  </TableCell>
                  <TableCell className="font-extrabold text-primary">{ds.Size?.SizeName}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {ds.Size?.VolumeML} ml
                  </TableCell>
                  <TableCell className="font-bold font-mono text-foreground flex items-center gap-0.5">
                    <DollarSign className="w-4 h-4 text-primary" />{' '}
                    {ds.UnitPrice.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    <Badge variant={ds.DrinkSizeStatus === 'AVAILABLE' ? 'success' : 'neutral'}>
                      {ds.DrinkSizeStatus === 'AVAILABLE' ? 'Đang bán' : 'Tạm khóa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openUpdateForm(ds)}
                    >
                      Sửa Giá
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-red-200 hover:bg-red-50 text-red-500"
                      onClick={() => handleDeleteMatrix(ds.DrinkSizeID)}
                    >
                      Gỡ bỏ
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Form Dialog Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedDS ? 'Cập nhật giá bán đồ uống' : 'Tạo mới bảng giá bán lẻ'}
      >
        <form onSubmit={handleSaveMatrix} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Lựa chọn Đồ uống *
            </label>
            <select
              value={selectedDrinkId}
              onChange={(e) => setSelectedDrinkId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              {drinks.map((d) => (
                <option key={d.DrinkID} value={d.DrinkID}>
                  {d.DrinkName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Kích cỡ ly *
            </label>
            <select
              value={selectedSizeId}
              onChange={(e) => setSelectedSizeId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              {sizes.map((s) => (
                <option key={s.SizeID} value={s.SizeID}>
                  {s.SizeName} ({s.VolumeML}ml)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Đơn giá bán lẻ (đ) *
            </label>
            <Input
              type="number"
              placeholder="Nhập giá bán e.g. 55000"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value))}
              className="bg-background/40 font-mono"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-3 rounded-xl"
              onClick={() => setIsFormOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 py-3 rounded-xl font-serif uppercase tracking-wider font-extrabold"
            >
              Lưu Lại
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
