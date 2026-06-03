'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash, Users, Mail, Phone, MapPin, Search } from 'lucide-react';
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
import { api, Supplier } from '@/lib/api';
import { toast } from 'sonner';

export default function SuppliersDirectory() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [addressNum, setAddressNum] = useState('');
  const [phone, setPhone] = useState('');

  const loadSuppliers = async () => {
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const openCreateForm = () => {
    setSelectedSupplier(null);
    setName('');
    setEmail('');
    setCity('Hà Nội');
    setStreet('');
    setAddressNum('');
    setPhone('');
    setIsFormOpen(true);
  };

  const openUpdateForm = (s: Supplier) => {
    setSelectedSupplier(s);
    setName(s.SupplierName);
    setEmail(s.SupplierEmail);
    setCity(s.City || '');
    setStreet(s.Street || '');
    setAddressNum(s.AddressNumber || '');
    setPhone(s.SupplierPhones?.[0]?.PhoneNumber || '');
    setIsFormOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      toast.error('Tên nhà cung cấp, email và số điện thoại liên lạc là bắt buộc.');
      return;
    }

    try {
      const payload = {
        SupplierName: name,
        SupplierEmail: email,
        City: city || null,
        Street: street || null,
        AddressNumber: addressNum || null,
        PhoneNumbers: [phone],
      };

      if (selectedSupplier) {
        await api.updateSupplier(selectedSupplier.SupplierID, payload);
        toast.success('Cập nhật nhà cung cấp thành công!');
      } else {
        await api.createSupplier(payload);
        toast.success('Thêm mới nhà cung cấp thành công!');
      }
      setIsFormOpen(false);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu nhà cung cấp.');
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (
      !confirm(
        'Bạn có đồng ý xóa nhà cung cấp này? Cảnh báo: Các hóa đơn liên kết có thể bị ảnh hưởng.',
      )
    )
      return;
    try {
      await api.deleteSupplier(id);
      toast.success('Đã xóa nhà cung cấp thành công.');
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa nhà cung cấp.');
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.SupplierName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Đối Tác & Nhà Cung Cấp
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Danh mục nhà cung cấp chè khô, thiết bị máy pha trà Phêla chính hãng
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Thêm nhà cung cấp
        </Button>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm nhà cung cấp theo tên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-3 rounded-xl cafe-panel"
        />
      </div>

      {/* Suppliers Table list */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải đối tác...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Không có nhà cung cấp nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên Nhà Cung Cấp</TableHead>
                <TableHead>Liên hệ Email</TableHead>
                <TableHead>Số Điện Thoại</TableHead>
                <TableHead>Địa Chỉ</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((s) => (
                <TableRow key={s.SupplierID}>
                  <TableCell className="font-mono font-bold text-xs text-primary">
                    #SUP-{s.SupplierID}
                  </TableCell>
                  <TableCell className="font-serif font-bold text-base text-foreground tracking-tight">
                    {s.SupplierName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" /> {s.SupplierEmail}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />{' '}
                      {s.SupplierPhones?.[0]?.PhoneNumber || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />{' '}
                      {s.AddressNumber ? `${s.AddressNumber} ` : ''}
                      {s.Street ? `${s.Street}, ` : ''}
                      {s.City || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openUpdateForm(s)}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-red-200 hover:bg-red-50 text-red-500"
                      onClick={() => handleDeleteSupplier(s.SupplierID)}
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
        title={selectedSupplier ? 'Cập nhật đối tác' : 'Khai báo đối tác mới'}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Tên đối tác nhà cung cấp *
            </label>
            <Input
              placeholder="e.g. Nông Trường Trà Oolong Cầu Đất"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Địa chỉ Email *
              </label>
              <Input
                type="email"
                placeholder="e.g. contact@caudat.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/40 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Số Điện Thoại liên lạc *
              </label>
              <Input
                placeholder="e.g. 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background/40 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Số nhà</label>
              <Input
                placeholder="e.g. 15B"
                value={addressNum}
                onChange={(e) => setAddressNum(e.target.value)}
                className="bg-background/40 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Tên đường
              </label>
              <Input
                placeholder="e.g. Nguyễn Trãi"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="bg-background/40 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Thành Phố
              </label>
              <Input
                placeholder="e.g. Đà Lạt"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-background/40 text-xs"
              />
            </div>
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
