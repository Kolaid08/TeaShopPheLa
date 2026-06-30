'use client';

import React, { useEffect, useState } from 'react';
import { Plus, CheckCircle, FileText, Calendar, PlusCircle, Trash2 } from 'lucide-react';
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
import { api, IngredientReceipt, Supplier, Ingredient, Employee } from '@/lib/api';
import { toast } from 'sonner';
import { MapPin, Truck } from 'lucide-react';

interface ReceiptItem {
  IngredientID: number;
  Quantity: number;
  CostPrice: number;
}

export default function IngredientReceipts() {
  const [receipts, setReceipts] = useState<IngredientReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [shippers, setShippers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(0);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]!);
  const [items, setItems] = useState<ReceiptItem[]>([]);

  // Item additions states
  const [addItemId, setAddItemId] = useState(0);
  const [addQty, setAddQty] = useState(10);
  const [addCost, setAddCost] = useState(5000);

  // Shipper assignment states
  const [isAssignShipperOpen, setIsAssignShipperOpen] = useState(false);
  const [assignReceiptId, setAssignReceiptId] = useState(0);
  const [selectedShipperId, setSelectedShipperId] = useState(0);
  const [shippingAddress, setShippingAddress] = useState('');

  const loadReceipts = async () => {
    try {
      const [rList, sList, iList, eList] = await Promise.all([
        api.getReceipts(),
        api.getSuppliers(),
        api.getIngredients(),
        api.getEmployees(),
      ]);
      setReceipts(rList);
      setSuppliers(sList);
      setIngredients(iList);
      setShippers(eList.filter(e => e.Role?.RoleName === 'Shipper' || !e.Role || e.Role?.RoleName === 'STAFF'));
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const openCreateForm = () => {
    setSelectedSupplierId(suppliers[0]?.SupplierID || 0);
    setReceivedDate(new Date().toISOString().split('T')[0]!);
    setItems([]);
    setAddItemId(ingredients[0]?.IngredientID || 0);
    setAddQty(100);
    setAddCost(10000);
    setIsFormOpen(true);
  };

  const handleAddItemToReceipt = () => {
    if (!addItemId) return;
    const exists = items.findIndex((i) => i.IngredientID === addItemId);
    if (exists !== -1) {
      toast.error('Nguyên liệu này đã có trong danh sách nhập kho.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        IngredientID: addItemId,
        Quantity: addQty,
        CostPrice: addCost,
      },
    ]);
    toast.success('Đã thêm dòng vật tư nhập kho.');
  };

  const handleRemoveItemFromReceipt = (idx: number) => {
    const updated = [...items];
    updated.splice(idx, 1);
    setItems(updated);
  };

  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || items.length === 0) {
      toast.error('Vui lòng chọn nhà cung cấp và thêm ít nhất một nguyên liệu nhập kho.');
      return;
    }

    try {
      const payload = {
        SupplierID: selectedSupplierId,
        ReceivedDate: receivedDate,
        Ingredients: items,
      };

      await api.createReceipt(payload);
      toast.success('Lập phiếu nhập kho thành công! Trạng thái: Chờ duyệt (Pending)');
      setIsFormOpen(false);
      loadReceipts();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lập phiếu nhập kho.');
    }
  };

  const handleConfirmReceipt = async (id: number) => {
    if (
      !confirm(
        'Bạn có đồng ý phê duyệt phiếu này và cộng số lượng tồn kho? Hành động này không thể hoàn tác.',
      )
    )
      return;
    try {
      await api.confirmReceipt(id);
      toast.success('Phê duyệt phiếu nhập kho thành công! Kho nguyên liệu đã được cộng dồn.');
      loadReceipts();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi duyệt phiếu nhập kho.');
    }
  };

  const openAssignShipper = (rec: IngredientReceipt) => {
    setAssignReceiptId(rec.IngredientReceiptID);
    setSelectedShipperId(shippers[0]?.EmployeeID || 0);
    const supplierAddress = rec.Supplier?.SupplierName ? `Kho ${rec.Supplier.SupplierName}` : '';
    setShippingAddress(supplierAddress);
    setIsAssignShipperOpen(true);
  };

  const handleAssignShipper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipperId) {
      toast.error('Vui lòng chọn tài xế giao hàng.');
      return;
    }
    try {
      await api.assignReceiptShipper(assignReceiptId, selectedShipperId, shippingAddress, 0, 0);
      toast.success('Đã điều phối shipper đi lấy hàng thành công.');
      setIsAssignShipperOpen(false);
      loadReceipts();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi điều phối shipper.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Hóa Đơn Nhập Kho
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Hồ sơ chứng từ nhập khẩu nguyên liệu và chè ô long thô cửa hàng
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Lập phiếu nhập kho
        </Button>
      </div>

      {/* Receipts list table */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải lịch sử nhập kho...
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <FileText className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-semibold text-sm">Chưa có lịch sử chứng từ nhập kho nào.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã phiếu</TableHead>
                <TableHead>Nhà Cung Cấp</TableHead>
                <TableHead>Ngày Nhận</TableHead>
                <TableHead>Chi tiết vật tư nhập</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((rec) => (
                <TableRow key={rec.IngredientReceiptID}>
                  <TableCell className="font-mono font-bold text-xs text-primary">
                    #REC-{rec.IngredientReceiptID}
                  </TableCell>
                  <TableCell className="font-serif font-black text-base text-foreground tracking-tight">
                    {rec.Supplier?.SupplierName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(rec.ReceivedDate).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {rec.IngredientReceiptDetails?.map((det, idx) => (
                        <div key={idx} className="text-xs text-foreground">
                          {det.Ingredient?.IngredientName} x{' '}
                          <span className="font-bold">{det.Quantity}</span> (Đơn giá:{' '}
                          {det.CostPrice.toLocaleString('vi-VN')} đ)
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rec.IngredientReceiptStatus === 'CONFIRMED'
                          ? 'success'
                          : rec.IngredientReceiptStatus === 'SHIPPING'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {rec.IngredientReceiptStatus === 'CONFIRMED'
                        ? 'Đã duyệt'
                        : rec.IngredientReceiptStatus === 'SHIPPING'
                        ? 'Đang lấy hàng'
                        : 'Chờ xử lý'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {rec.IngredientReceiptStatus === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 gap-1 text-xs"
                          onClick={() => openAssignShipper(rec)}
                        >
                          <Truck className="w-3.5 h-3.5" /> Gọi Shipper lấy hàng
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                          onClick={() => handleConfirmReceipt(rec.IngredientReceiptID)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Tự đi lấy / Đã nhận
                        </Button>
                      </div>
                    )}
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
        title="Phiếu nhập kho nguyên liệu"
      >
        <form onSubmit={handleSaveReceipt} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Nhà Cung Cấp *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(parseInt(e.target.value))}
                className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {suppliers.map((s) => (
                  <option key={s.SupplierID} value={s.SupplierID}>
                    {s.SupplierName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Ngày nhập khẩu *
              </label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="bg-background/40 font-mono"
              />
            </div>
          </div>

          {/* Items Addition grid panel */}
          <div className="p-4 rounded-xl border border-border bg-surface/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-primary">
              Thêm vật tư nhập kho:
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Nguyên liệu
                </label>
                <select
                  value={addItemId}
                  onChange={(e) => setAddItemId(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background/40 p-2 text-xs focus:outline-none"
                >
                  {ingredients.map((i) => (
                    <option key={i.IngredientID} value={i.IngredientID}>
                      {i.IngredientName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Số lượng nhập
                </label>
                <Input
                  type="number"
                  value={addQty}
                  onChange={(e) => setAddQty(parseFloat(e.target.value))}
                  className="p-2 h-9 text-xs font-mono bg-background/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Giá vốn nhập (đ)
                </label>
                <Input
                  type="number"
                  value={addCost}
                  onChange={(e) => setAddCost(parseFloat(e.target.value))}
                  className="p-2 h-9 text-xs font-mono bg-background/40"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5 rounded-lg py-2 mt-2 font-bold text-xs"
              onClick={handleAddItemToReceipt}
            >
              <PlusCircle className="w-4 h-4 text-primary" /> Đưa vào danh sách phiếu
            </Button>
          </div>

          {/* List added items */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground block">
              Danh sách vật tư chờ nhập:
            </span>
            {items.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-xl">
                Chưa có vật tư nào được chọn.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl bg-background/30 p-2 text-xs max-h-40 overflow-y-auto">
                {items.map((item, idx) => {
                  const ingName = ingredients.find(
                    (i) => i.IngredientID === item.IngredientID,
                  )?.IngredientName;
                  return (
                    <div key={idx} className="flex justify-between py-2 items-center">
                      <span>
                        {ingName} x <span className="font-bold">{item.Quantity}</span> (Đơn giá:{' '}
                        {item.CostPrice.toLocaleString('vi-VN')} đ)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemFromReceipt(idx)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl font-bold"
            >
              Hủy
            </Button>
            <Button type="submit" className="rounded-xl font-bold px-6 text-white uppercase font-serif tracking-wider">
              Lưu Phiếu
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Assign Shipper Modal */}
      <Dialog
        isOpen={isAssignShipperOpen}
        onClose={() => setIsAssignShipperOpen(false)}
        title="Điều phối Shipper lấy hàng (Phiếu nhập)"
      >
        <form onSubmit={handleAssignShipper} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Chọn nhân viên lấy hàng *
            </label>
            <select
              value={selectedShipperId}
              onChange={(e) => setSelectedShipperId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value={0}>-- Chọn Shipper --</option>
              {shippers.map((s) => (
                <option key={s.EmployeeID} value={s.EmployeeID}>
                  {s.FullName} - {s.PhoneNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Địa chỉ nhận nguyên liệu *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="VD: Kho hàng nhà cung cấp..."
                className="pl-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Shipper sẽ được chỉ dẫn tới địa chỉ này để nhận nguyên liệu mang về quán.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignShipperOpen(false)}
              className="rounded-xl font-bold"
            >
              Hủy
            </Button>
            <Button type="submit" className="rounded-xl font-bold px-6 bg-primary text-white uppercase font-serif tracking-wider">
              Phân Công
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
