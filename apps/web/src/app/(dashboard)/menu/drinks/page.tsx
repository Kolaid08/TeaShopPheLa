'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Layers, Coffee, Search } from 'lucide-react';
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
import { api, Drink } from '@/lib/api';
import { toast } from 'sonner';

export default function DrinksMenu() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  // Form states
  const [drinkName, setDrinkName] = useState('');
  const [drinkDescription, setDrinkDescription] = useState('');
  const [drinkStatus, setDrinkStatus] = useState('ACTIVE');
  const [drinkImage, setDrinkImage] = useState('');

  const loadDrinks = async () => {
    try {
      const data = await api.getDrinks();
      setDrinks(data);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadDrinks();
  }, []);

  const openCreateForm = () => {
    setSelectedDrink(null);
    setDrinkName('');
    setDrinkDescription('');
    setDrinkStatus('ACTIVE');
    setDrinkImage('');
    setIsFormOpen(true);
  };

  const openUpdateForm = (drink: Drink) => {
    setSelectedDrink(drink);
    setDrinkName(drink.DrinkName);
    setDrinkDescription(drink.DrinkDescription || '');
    setDrinkStatus(drink.DrinkStatus);
    setDrinkImage(drink.DrinkImageURL || '');
    setIsFormOpen(true);
  };

  const handleSaveDrink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drinkName) {
      toast.error('Vui lòng nhập tên đồ uống.');
      return;
    }

    try {
      const payload = {
        DrinkName: drinkName,
        DrinkDescription: drinkDescription || null,
        DrinkImageURL: drinkImage || null,
        DrinkStatus: drinkStatus,
      };

      if (selectedDrink) {
        await api.updateDrink(selectedDrink.DrinkID, payload);
        toast.success('Cập nhật thông tin đồ uống thành công!');
      } else {
        await api.createDrink(payload);
        toast.success('Thêm mới đồ uống Phêla thành công!');
      }
      setIsFormOpen(false);
      loadDrinks();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu thông tin đồ uống.');
    }
  };

  const handleDeleteDrink = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đồ uống này khỏi thực đơn?')) return;
    try {
      await api.deleteDrink(id);
      toast.success('Đã xóa món ăn/đồ uống khỏi thực đơn.');
      loadDrinks();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa đồ uống.');
    }
  };

  const filteredDrinks = drinks.filter((d) =>
    d.DrinkName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Thực Đơn Đồ Uống
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Danh mục trà sữa Oolong và Coffee thủ công Phêla
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Thêm món mới
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm đồ uống theo tên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-3 rounded-xl cafe-panel"
        />
      </div>

      {/* Drinks Table Grid */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải danh mục thực đơn...
          </div>
        ) : filteredDrinks.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Layers className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-semibold text-sm">Thực đơn trống. Hãy thêm món mới ngay.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã món</TableHead>
                <TableHead>Tên Đồ Uống</TableHead>
                <TableHead>Mô tả chi tiết</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrinks.map((drink) => (
                <TableRow key={drink.DrinkID}>
                  <TableCell className="font-mono font-bold text-xs text-primary">
                    #DK-{drink.DrinkID}
                  </TableCell>
                  <TableCell className="font-serif font-black text-base text-foreground tracking-tight flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-primary" /> {drink.DrinkName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {drink.DrinkDescription || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={drink.DrinkStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                      {drink.DrinkStatus === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openUpdateForm(drink)}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary" /> Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-red-200 hover:bg-red-50 text-red-500"
                      onClick={() => handleDeleteDrink(drink.DrinkID)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create/Update Modal Form */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedDrink ? 'Cập nhật món nước' : 'Thêm đồ uống mới'}
      >
        <form onSubmit={handleSaveDrink} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Tên đồ uống Phêla *
            </label>
            <Input
              placeholder="Nhập tên đồ uống e.g. Ô Long sữa"
              value={drinkName}
              onChange={(e) => setDrinkName(e.target.value)}
              className="bg-background/40"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Mô tả sản phẩm
            </label>
            <textarea
              placeholder="Mô tả về trà oolong kết hợp trân châu..."
              value={drinkDescription}
              onChange={(e) => setDrinkDescription(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              rows={3}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Hình ảnh URL (Không bắt buộc)
            </label>
            <Input
              placeholder="e.g. /uploads/image.png"
              value={drinkImage}
              onChange={(e) => setDrinkImage(e.target.value)}
              className="bg-background/40"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Trạng thái bán hàng
            </label>
            <select
              value={drinkStatus}
              onChange={(e) => setDrinkStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ACTIVE">Đang phục vụ (Active)</option>
              <option value="INACTIVE">Ngừng bán (Inactive)</option>
            </select>
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
