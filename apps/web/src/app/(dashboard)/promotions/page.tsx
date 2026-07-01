'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Plus, Search, CheckCircle2, XCircle } from 'lucide-react';
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

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PERCENT'); // PERCENT, AMOUNT, FREE_ITEM
  const [value, setValue] = useState<number>(0);
  const [minQuantity, setMinQuantity] = useState<number>(2);

  const loadData = async () => {
    try {
      const p = await api.getPromotions();
      setPromotions(p);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải danh sách khuyến mãi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (promo: any = null) => {
    if (promo) {
      setEditingPromotion(promo);
      setName(promo.Name);
      setDescription(promo.Description || '');
      setType(promo.Type);
      setValue(promo.Value);
      setMinQuantity(promo.MinQuantity);
    } else {
      setEditingPromotion(null);
      setName('');
      setDescription('');
      setType('PERCENT');
      setValue(0);
      setMinQuantity(2);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        Name: name,
        Description: description,
        Type: type,
        Value: Number(value),
        MinQuantity: Number(minQuantity),
        IsActive: true
      };

      if (editingPromotion) {
        await api.updatePromotion(editingPromotion.PromotionID, data);
        toast.success('Cập nhật khuyến mãi thành công!');
      } else {
        await api.createPromotion(data);
        toast.success('Tạo khuyến mãi mới thành công!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu khuyến mãi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa khuyến mãi này?')) {
      try {
        await api.deletePromotion(id);
        toast.success('Đã xóa khuyến mãi');
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Lỗi xóa khuyến mãi');
      }
    }
  };

  const handleToggleActive = async (promo: any) => {
    try {
      await api.updatePromotion(promo.PromotionID, {
        ...promo,
        IsActive: !promo.IsActive
      });
      toast.success('Đã cập nhật trạng thái');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight flex items-center gap-2">
            <Gift className="w-8 h-8 text-primary" />
            Quản Lý Combo Khuyến Mãi
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Thiết lập các chương trình Mua 2 tặng 1, Giảm giá 10% khi mua 2 ly...
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Tạo Khuyến Mãi
        </Button>
      </div>

      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên Chương Trình</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Loại KM</TableHead>
                  <TableHead>Điều Kiện</TableHead>
                  <TableHead>Giá Trị</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Chưa có chương trình khuyến mãi nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  promotions.map((promo) => (
                    <TableRow key={promo.PromotionID}>
                      <TableCell className="font-bold text-foreground">
                        {promo.Name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {promo.Description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {promo.Type === 'PERCENT' ? 'Giảm %' : promo.Type === 'AMOUNT' ? 'Giảm Tiền' : 'Tặng Quà'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        Mua tối thiểu {promo.MinQuantity} ly
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {promo.Type === 'PERCENT' ? `${promo.Value}%` : promo.Type === 'AMOUNT' ? `${promo.Value.toLocaleString('vi-VN')} đ` : `Tặng ${promo.Value} món`}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={promo.IsActive ? 'success' : 'secondary'} 
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(promo)}
                        >
                          {promo.IsActive ? 'Đang chạy' : 'Đã dừng'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(promo)}>
                          Sửa
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(promo.PromotionID)}>
                          Xóa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPromotion ? 'Sửa Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'} maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground">Tên chương trình</label>
            <Input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Giảm 10% khi mua 2 ly"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground">Mô tả (tùy chọn)</label>
            <Input 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground">Số lượng ly tối thiểu (Combo)</label>
              <Input 
                type="number"
                min={1}
                required
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground">Loại khuyến mãi</label>
              <select 
                className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="PERCENT">Giảm phần trăm (%)</option>
                <option value="AMOUNT">Giảm số tiền cố định</option>
                <option value="FREE_ITEM">Tặng số lượng món</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground">Giá trị ({type === 'PERCENT' ? '%' : type === 'AMOUNT' ? 'VNĐ' : 'Số món tặng'})</label>
            <Input 
              type="number"
              min={0}
              required
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu Khuyến Mãi'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
