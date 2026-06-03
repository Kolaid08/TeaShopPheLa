'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Search, Gift, Smile, Award } from 'lucide-react';
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
import { api, Customer, MembershipLevel } from '@/lib/api';
import { toast } from 'sonner';

export default function CustomersLoyalty() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [levels, setLevels] = useState<MembershipLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [spending, setSpending] = useState(0);

  const loadCustomers = async () => {
    try {
      const [cList, lList] = await Promise.all([api.getCustomers(), api.getMembershipLevels()]);
      setCustomers(cList);
      setLevels(lList);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openCreateForm = () => {
    setSelectedCust(null);
    setName('');
    setEmail('');
    setPhone('');
    setSpending(0);
    setIsFormOpen(true);
  };

  const openUpdateForm = (c: Customer) => {
    setSelectedCust(c);
    setName(c.CustomerName);
    setEmail(c.Email || '');
    setPhone(c.PhoneNumber);
    setSpending(c.TotalMoneySpending);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Tên khách hàng và số điện thoại hội viên là bắt buộc.');
      return;
    }

    try {
      const payload = {
        CustomerName: name,
        Email: email || null,
        PhoneNumber: phone,
        TotalMoneySpending: spending,
      };

      if (selectedCust) {
        await api.updateCustomer(selectedCust.CustomerID, payload);
        toast.success('Cập nhật thẻ hội viên thành công!');
      } else {
        await api.createCustomer(payload);
        toast.success('Đăng ký thẻ hội viên Phêla mới thành công!');
      }
      setIsFormOpen(false);
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi đăng ký hội viên.');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.CustomerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.PhoneNumber.includes(searchTerm),
  );

  const getLevelBadge = (level: string) => {
    if (level.includes('Đồng')) return <Badge variant="neutral">{level}</Badge>;
    if (level.includes('Bạc')) return <Badge variant="info">{level}</Badge>;
    if (level.includes('Vàng')) return <Badge variant="warning">{level}</Badge>;
    return <Badge variant="success">{level}</Badge>; // Kim cương
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Hội Viên Thân Thiết (Loyalty)
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Danh sách tích điểm và thăng cấp hạng hội viên Phêla Việt Nam
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Đăng ký hội viên mới
        </Button>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm hội viên theo Tên hoặc Số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-3 rounded-xl cafe-panel"
        />
      </div>

      {/* Table grid */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải sổ hội viên...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Không tìm thấy hội viên phù hợp.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hội Viên</TableHead>
                <TableHead>Số Điện Thoại</TableHead>
                <TableHead>Email Liên Hệ</TableHead>
                <TableHead>Tổng Chi Tiêu</TableHead>
                <TableHead>Hạng Hội Viên</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.CustomerID}>
                  <TableCell className="font-serif font-bold text-base text-foreground tracking-tight flex items-center gap-2">
                    <Smile className="w-4.5 h-4.5 text-primary" /> {c.CustomerName}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-bold text-foreground">
                    {c.PhoneNumber}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {c.Email || 'N/A'}
                  </TableCell>
                  <TableCell className="font-bold font-mono text-primary flex items-center gap-0.5">
                    <Award className="w-4 h-4" /> {c.TotalMoneySpending.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    {getLevelBadge(c.MemberShipLevel?.LevelName || 'Đồng (Bronze)')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openUpdateForm(c)}
                    >
                      Sửa Thẻ
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
        title={selectedCust ? 'Cập nhật thẻ hội viên' : 'Đăng ký thành viên Phêla mới'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Tên khách hàng *
            </label>
            <Input
              placeholder="e.g. Nguyễn Văn Thắng"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Số điện thoại hội viên *
              </label>
              <Input
                placeholder="e.g. 0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background/40 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Địa chỉ Email
              </label>
              <Input
                type="email"
                placeholder="e.g. thang@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/40 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Tổng chi tiêu thiết lập (đ)
            </label>
            <Input
              type="number"
              value={spending}
              onChange={(e) => setSpending(parseFloat(e.target.value))}
              className="bg-background/40 font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-primary" /> Hạng thẻ sẽ thăng cấp tự động dựa theo
              tổng số chi tiêu.
            </p>
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
              Đăng Ký
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
