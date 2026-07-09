'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Search, Layers, Beaker } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  Dialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/core';
import { api, Topping, Ingredient } from '@/lib/api';
import { toast } from 'sonner';

export default function ToppingsMenu() {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTopping, setSelectedTopping] = useState<Topping | null>(null);
  const [toppingName, setToppingName] = useState('');
  const [price, setPrice] = useState('');
  const [recipeDetails, setRecipeDetails] = useState<{ IngredientID: number; Quantity: string }[]>(
    []
  );

  const loadData = async () => {
    try {
      const [toppingsData, ingredientsData] = await Promise.all([
        api.getToppings(),
        api.getIngredients(),
      ]);
      setToppings(toppingsData);
      setIngredients(ingredientsData);
    } catch (err) {
      toast.error('Lỗi tải dữ liệu topping');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateForm = () => {
    setSelectedTopping(null);
    setToppingName('');
    setPrice('');
    setRecipeDetails([]);
    setIsFormOpen(true);
  };

  const openUpdateForm = (t: Topping) => {
    setSelectedTopping(t);
    setToppingName(t.ToppingName);
    setPrice(t.Price.toString());
    setRecipeDetails(
      t.ToppingRecipeDetails?.map((rd) => ({
        IngredientID: rd.IngredientID,
        Quantity: rd.Quantity.toString(),
      })) || []
    );
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toppingName || !price) {
      toast.error('Vui lòng nhập đủ tên và giá Topping.');
      return;
    }

    const payload = {
      ToppingName: toppingName,
      Price: parseFloat(price),
      Ingredients: recipeDetails
        .filter((d) => d.IngredientID && parseFloat(d.Quantity) > 0)
        .map((d) => ({
          IngredientID: d.IngredientID,
          Quantity: parseFloat(d.Quantity),
        })),
    };

    try {
      if (selectedTopping) {
        await api.updateTopping(selectedTopping.ToppingID, payload);
        toast.success('Cập nhật Topping thành công!');
      } else {
        await api.createTopping(payload);
        toast.success('Thêm Topping thành công!');
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu Topping.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa Topping này?')) return;
    try {
      await api.deleteTopping(id);
      toast.success('Xóa Topping thành công.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa Topping.');
    }
  };

  const addIngredientRow = () => {
    setRecipeDetails([...recipeDetails, { IngredientID: 0, Quantity: '' }]);
  };

  const removeIngredientRow = (idx: number) => {
    const updated = [...recipeDetails];
    updated.splice(idx, 1);
    setRecipeDetails(updated);
  };

  const updateIngredientRow = (idx: number, field: 'IngredientID' | 'Quantity', val: string) => {
    const updated = [...recipeDetails];
    if (!updated[idx]) return;
    if (field === 'IngredientID') updated[idx]!.IngredientID = parseInt(val) || 0;
    if (field === 'Quantity') updated[idx]!.Quantity = val;
    setRecipeDetails(updated);
  };

  const filteredToppings = toppings.filter((t) =>
    t.ToppingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredToppings.length / itemsPerPage);
  const currentToppings = filteredToppings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Quản Lý Topping
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Thiết lập Topping và định lượng nguyên liệu
          </p>
        </div>
        <Button onClick={openCreateForm} className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold">
          <Plus className="w-4 h-4" /> Thêm Topping
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm topping..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10 py-3 rounded-xl cafe-panel"
        />
      </div>

      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">Đang tải...</div>
        ) : filteredToppings.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Layers className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-semibold text-sm">Chưa có topping nào.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Topping</TableHead>
                <TableHead>Giá (VNĐ)</TableHead>
                <TableHead>Công thức (Nguyên liệu)</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentToppings.map((t) => (
                <TableRow key={t.ToppingID}>
                  <TableCell className="font-serif font-bold text-base text-foreground">
                    {t.ToppingName}
                  </TableCell>
                  <TableCell className="font-mono text-primary font-semibold">
                    {new Intl.NumberFormat('vi-VN').format(t.Price)} đ
                  </TableCell>
                  <TableCell>
                    {t.ToppingRecipeDetails && t.ToppingRecipeDetails.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.ToppingRecipeDetails.map((rd, idx) => (
                          <span key={idx} className="bg-background/50 border border-border px-2 py-0.5 rounded text-xs">
                            {rd.Ingredient?.IngredientName}: {rd.Quantity}{rd.Ingredient?.Unit?.UnitName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Chưa cấu hình</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openUpdateForm(t)}>
                      <Edit3 className="w-3.5 h-3.5" /> Sửa
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl border-red-200 text-red-500 hover:bg-red-50" onClick={() => handleDelete(t.ToppingID)}>
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <Button variant="outline" className="rounded-full w-10 h-10 p-0" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
            &lt;
          </Button>
          <span className="text-sm font-bold">{currentPage} / {totalPages}</span>
          <Button variant="outline" className="rounded-full w-10 h-10 p-0" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
            &gt;
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedTopping ? 'Cập nhật Topping' : 'Thêm Topping mới'}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Tên Topping *</label>
            <Input required value={toppingName} onChange={(e) => setToppingName(e.target.value)} className="bg-background/40" placeholder="vd. Trân châu đen" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Giá bán (VNĐ) *</label>
            <Input required type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-background/40" placeholder="vd. 10000" />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Beaker className="w-4 h-4 text-primary" /> Định lượng nguyên liệu
              </label>
              <Button type="button" size="sm" variant="outline" onClick={addIngredientRow} className="rounded-xl text-xs h-7">
                <Plus className="w-3 h-3 mr-1" /> Thêm nguyên liệu
              </Button>
            </div>
            
            <div className="space-y-2">
              {recipeDetails.map((rd, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-background/30 p-2 rounded-lg border border-border">
                  <select
                    className="flex-1 rounded-xl border border-border bg-background/50 px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={rd.IngredientID}
                    onChange={(e) => updateIngredientRow(idx, 'IngredientID', e.target.value)}
                  >
                    <option value={0}>-- Chọn nguyên liệu --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.IngredientID} value={ing.IngredientID}>
                        {ing.IngredientName} (còn: {ing.QuantityStock} {ing.Unit?.UnitName})
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Số lượng"
                    value={rd.Quantity}
                    onChange={(e) => updateIngredientRow(idx, 'Quantity', e.target.value)}
                    className="w-24 h-9 bg-background/50"
                  />
                  <Button type="button" variant="outline" className="w-9 h-9 p-0 text-red-500 border-red-200" onClick={() => removeIngredientRow(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {recipeDetails.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-2">Chưa thêm nguyên liệu nào. Topping này sẽ không tự trừ kho.</p>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button type="button" variant="outline" className="flex-1 py-3 rounded-xl" onClick={() => setIsFormOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" className="flex-1 py-3 rounded-xl font-serif uppercase tracking-wider font-extrabold">
              Lưu Lại
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
