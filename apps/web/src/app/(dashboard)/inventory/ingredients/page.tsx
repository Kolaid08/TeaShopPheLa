'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, ShieldAlert, Search } from 'lucide-react';
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
import { api, Ingredient, Unit } from '@/lib/api';
import { toast } from 'sonner';

export default function IngredientsInventory() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIng, setSelectedIng] = useState<Ingredient | null>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(0);
  const [selectedUnitId, setSelectedUnitId] = useState(0);

  const loadIngredients = async () => {
    try {
      const [iList, uList] = await Promise.all([api.getIngredients(), api.getUnits()]);
      setIngredients(iList);
      setUnits(uList);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadIngredients();
  }, []);

  const openCreateForm = () => {
    setSelectedIng(null);
    setName('');
    setQty(100);
    setSelectedUnitId(units[0]?.UnitID || 0);
    setIsFormOpen(true);
  };

  const openUpdateForm = (ing: Ingredient) => {
    setSelectedIng(ing);
    setName(ing.IngredientName);
    setQty(ing.QuantityStock);
    setSelectedUnitId(ing.UnitID);
    setIsFormOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedUnitId || qty === undefined) {
      toast.error('Vui lòng điền đầy đủ các thông tin cần thiết.');
      return;
    }

    try {
      const payload = {
        IngredientName: name,
        QuantityStock: qty,
        UnitID: selectedUnitId,
      };

      if (selectedIng) {
        await api.updateIngredient(selectedIng.IngredientID, payload);
        toast.success('Cập nhật nguyên liệu thành công!');
      } else {
        await api.createIngredient(payload);
        toast.success('Khai báo nguyên liệu mới thành công!');
      }
      setIsFormOpen(false);
      loadIngredients();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu nguyên liệu.');
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nguyên liệu này?')) return;
    try {
      await api.deleteIngredient(id);
      toast.success('Đã xóa nguyên liệu khỏi kho.');
      loadIngredients();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa nguyên liệu.');
    }
  };

  const filteredIngredients = ingredients.filter((i) =>
    i.IngredientName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStockBadge = (stock: number) => {
    if (stock < 10) return <Badge variant="danger">Báo động đỏ (Low)</Badge>;
    if (stock < 50) return <Badge variant="warning">Mức trung bình (Medium)</Badge>;
    return <Badge variant="success">An toàn (High)</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Quản Lý Kho Nguyên Liệu
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Quản lý tồn kho nguyên liệu chè khô, bột sữa béo, trân châu Phêla
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Khai báo nguyên liệu
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm nguyên liệu theo tên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-3 rounded-xl cafe-panel"
        />
      </div>

      {/* Ingredients Grid list */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải kho tồn nguyên liệu...
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Kho nguyên liệu trống.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã vật tư</TableHead>
                <TableHead>Tên Nguyên Liệu</TableHead>
                <TableHead>Lượng Tồn Kho</TableHead>
                <TableHead>Đơn Vị</TableHead>
                <TableHead>Trạng Thái Tồn</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIngredients.map((ing) => (
                <TableRow key={ing.IngredientID}>
                  <TableCell className="font-mono font-bold text-xs text-primary">
                    #MAT-{ing.IngredientID}
                  </TableCell>
                  <TableCell className="font-bold text-foreground flex items-center gap-1.5">
                    {ing.QuantityStock < 10 && (
                      <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />
                    )}
                    {ing.IngredientName}
                  </TableCell>
                  <TableCell className="font-bold font-mono text-foreground text-sm">
                    {ing.QuantityStock.toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground uppercase font-semibold">
                    {ing.Unit?.UnitName || 'g'}
                  </TableCell>
                  <TableCell>{getStockBadge(ing.QuantityStock)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openUpdateForm(ing)}
                    >
                      Sửa Kho
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-red-200 hover:bg-red-50 text-red-500"
                      onClick={() => handleDeleteIngredient(ing.IngredientID)}
                    >
                      Xóa
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
        title={selectedIng ? 'Cập nhật số lượng kho nguyên liệu' : 'Khai báo nguyên liệu mới'}
      >
        <form onSubmit={handleSaveIngredient} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Tên nguyên liệu *
            </label>
            <Input
              placeholder="e.g. Trà Ô Long Đà Lạt chắt lọc"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/40"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Số lượng tồn kho ban đầu *
            </label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value))}
              className="bg-background/40 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Đơn vị đo lường *
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              {units.map((u) => (
                <option key={u.UnitID} value={u.UnitID}>
                  {u.UnitName}
                </option>
              ))}
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
