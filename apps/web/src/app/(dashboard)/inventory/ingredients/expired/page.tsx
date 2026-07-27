'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, AlertCircle } from 'lucide-react';
import {
  Button,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Input,
  Dialog,
} from '@/components/ui/core';
import { api, IngredientReceiptDetail } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ExpiredIngredients() {
  const [batches, setBatches] = useState<IngredientReceiptDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for disposal
  const [isDisposeFormOpen, setIsDisposeFormOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<IngredientReceiptDetail | null>(null);
  const [disposeQty, setDisposeQty] = useState<number>(0);
  const [disposeReason, setDisposeReason] = useState<string>('');
  const [isDisposing, setIsDisposing] = useState(false);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const data = await api.getExpiredIngredients(7); // default 7 days warning
      setBatches(data);
    } catch (err: any) {
      toast.error('Không thể tải danh sách nguyên liệu hết hạn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const openDisposeForm = (batch: IngredientReceiptDetail) => {
    setSelectedBatch(batch);
    setDisposeQty(batch.QuantityRemaining);
    setDisposeReason('Hàng hết hạn/hỏng');
    setIsDisposeFormOpen(true);
  };

  const handleDispose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (disposeQty <= 0 || disposeQty > selectedBatch.QuantityRemaining) {
      toast.error('Số lượng huỷ không hợp lệ');
      return;
    }

    setIsDisposing(true);
    try {
      await api.disposeIngredients([{
        IngredientReceiptID: selectedBatch.IngredientReceiptID,
        IngredientID: selectedBatch.IngredientID,
        Quantity: disposeQty,
        Reason: disposeReason
      }]);
      toast.success('Huỷ nguyên liệu thành công và đã ghi nhận Phiếu Xuất Huỷ');
      setIsDisposeFormOpen(false);
      loadBatches();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra khi huỷ nguyên liệu');
    } finally {
      setIsDisposing(false);
    }
  };

  const isExpired = (dateString?: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/inventory/ingredients">
              <Button variant="outline" size="sm" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h2 className="font-serif font-black text-3xl text-foreground tracking-tight flex items-center gap-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
              Xử Lý Hàng Hết Hạn
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans pl-11">
            Quản lý và lập phiếu xuất huỷ cho các lô hàng hết hạn
          </p>
        </div>
      </div>

      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải dữ liệu...
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-green-500 mb-4 opacity-50" />
            <p>Tuyệt vời! Hiện không có lô nguyên liệu nào đã hoặc sắp hết hạn.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lô Nhập</TableHead>
                <TableHead>Tên Nguyên Liệu</TableHead>
                <TableHead>Hạn Sử Dụng</TableHead>
                <TableHead>Tồn Khả Dụng</TableHead>
                <TableHead>Nhà Cung Cấp</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const expired = isExpired(batch.ExpirationDate);
                return (
                  <TableRow key={`${batch.IngredientReceiptID}-${batch.IngredientID}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{batch.IngredientReceiptID}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {batch.Ingredient?.IngredientName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {batch.ExpirationDate ? new Date(batch.ExpirationDate).toLocaleDateString('vi-VN') : 'Không có'}
                        </span>
                        {expired ? (
                          <Badge variant="danger" className="text-[10px]">ĐÃ HẾT HẠN</Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">SẮP HẾT HẠN</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold font-mono text-foreground text-sm">
                      {Number(batch.QuantityRemaining).toLocaleString('vi-VN')} <span className="text-xs text-muted-foreground uppercase font-normal">{batch.Ingredient?.Unit?.UnitName}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {batch.IngredientReceipt?.Supplier?.SupplierName || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-red-200 hover:bg-red-50 text-red-500 gap-1.5"
                        onClick={() => openDisposeForm(batch)}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Lập Phiếu Huỷ
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog
        isOpen={isDisposeFormOpen}
        onClose={() => setIsDisposeFormOpen(false)}
        title="Lập Phiếu Xuất Huỷ Nguyên Liệu"
      >
        <form onSubmit={handleDispose} className="space-y-4">
          <div className="bg-red-50 text-red-800 p-3 rounded-xl text-sm border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              Thao tác này sẽ trừ thẳng số lượng tồn kho của <b>{selectedBatch?.Ingredient?.IngredientName}</b> và không thể hoàn tác. Một <b>Phiếu Xuất Huỷ</b> sẽ được ghi nhận lên hệ thống bằng tài khoản của bạn.
            </p>
          </div>
          
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Số lượng cần huỷ (Tối đa: {selectedBatch?.QuantityRemaining}) *
            </label>
            <div className="relative">
              <Input
                type="number"
                min="0.1"
                step="0.1"
                max={selectedBatch?.QuantityRemaining}
                value={disposeQty}
                onChange={(e) => setDisposeQty(parseFloat(e.target.value))}
                className="bg-background/40 font-mono pr-12"
              />
              <div className="absolute right-3 top-2.5 text-sm font-bold text-muted-foreground uppercase">
                {selectedBatch?.Ingredient?.Unit?.UnitName}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Lý do xuất huỷ *
            </label>
            <Input
              value={disposeReason}
              onChange={(e) => setDisposeReason(e.target.value)}
              placeholder="e.g. Quá hạn sử dụng, Ẩm mốc..."
              className="bg-background/40"
              required
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="flex-1 py-3 rounded-xl"
              onClick={() => setIsDisposeFormOpen(false)}
              disabled={isDisposing}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              className="flex-1 py-3 rounded-xl font-serif uppercase tracking-wider font-extrabold bg-red-500 hover:bg-red-600 text-white"
              disabled={isDisposing}
            >
              {isDisposing ? 'Đang Xử Lý...' : 'Xác Nhận Huỷ'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
