'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Shield, Calendar, Trash2, Search } from 'lucide-react';
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
import { api, Employee, EmployeeRole } from '@/lib/api';
import { toast } from 'sonner';

export default function EmployeesList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birth, setBirth] = useState('1998-01-01');
  const [sex, setSex] = useState('MALE');
  const [pinCode, setPinCode] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(0);

  const loadEmployees = async () => {
    try {
      const [eList, rList] = await Promise.all([api.getEmployees(), api.getRoles()]);
      setEmployees(eList);
      setRoles(rList);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openCreateForm = () => {
    setSelectedEmp(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setBirth('1998-01-01');
    setSex('MALE');
    setPinCode('');
    setPassword('');
    setSelectedRoleId(roles[0]?.RoleID || 0);
    setIsFormOpen(true);
  };

  const openUpdateForm = (e: Employee) => {
    setSelectedEmp(e);
    setFullName(e.FullName);
    setPhone(e.PhoneNumber);
    setEmail(e.Email);
    setBirth(e.Birth.split('T')[0]!);
    setSex(e.Sex);
    setPinCode(e.PINCode);
    setPassword(''); // leave empty to avoid change
    setSelectedRoleId(e.RoleID);
    setIsFormOpen(true);
  };

  const handleSaveEmployee = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!fullName || !phone || !email || !pinCode) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    try {
      const payload: any = {
        FullName: fullName,
        PhoneNumber: phone,
        Email: email,
        Birth: birth,
        Sex: sex,
        PINCode: pinCode,
        RoleID: selectedRoleId,
      };

      if (password) {
        payload.password = password;
      }

      if (selectedEmp) {
        await api.updateEmployee(selectedEmp.EmployeeID, payload);
        toast.success('Cập nhật nhân viên thành công!');
      } else {
        payload.password = password || 'password123'; // fallback
        await api.createEmployee(payload);
        toast.success('Đăng ký nhân sự Barista mới thành công!');
      }
      setIsFormOpen(false);
      loadEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu nhân sự.');
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Bạn có đồng ý xóa tài khoản Barista này khỏi hệ thống?')) return;
    try {
      await api.deleteEmployee(id);
      toast.success('Đã xóa nhân sự khỏi hệ thống.');
      loadEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa nhân sự.');
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.FullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.Email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getRoleColor = (role: string) => {
    if (role === 'ADMIN') return 'danger';
    if (role === 'MANAGER') return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Hồ Sơ Barista & Nhân Sự
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Danh bạ nhân viên, mã PIN đăng nhập và phân quyền Rota cửa hàng
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="rounded-xl gap-2 font-serif uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Đăng ký Barista mới
        </Button>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm nhân viên theo tên hoặc Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-3 rounded-xl cafe-panel"
        />
      </div>

      {/* Grid Table */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang tải danh sách nhân sự...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Không tìm thấy tài khoản nhân viên nào.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân Sự</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Số Điện Thoại</TableHead>
                <TableHead>Mã PIN POS</TableHead>
                <TableHead>Quyền Hạn</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.EmployeeID}>
                  <TableCell className="font-serif font-bold text-base text-foreground tracking-tight">
                    {emp.FullName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {emp.Email}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-foreground">
                    {emp.PhoneNumber}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-extrabold text-primary flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> **** (Code: {emp.PINCode})
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleColor(emp.Role?.RoleName || 'STAFF')}>
                      {emp.Role?.RoleName || 'STAFF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openUpdateForm(emp)}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-red-200 hover:bg-red-50 text-red-500"
                      onClick={() => handleDeleteEmployee(emp.EmployeeID)}
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
        title={selectedEmp ? 'Cập nhật tài khoản Barista' : 'Đăng ký Barista mới'}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Họ và Tên *
            </label>
            <Input
              placeholder="e.g. Hoàng Kiều Trang"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-background/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Số điện thoại *
              </label>
              <Input
                placeholder="e.g. 0977112233"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background/40 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Địa chỉ Email *
              </label>
              <Input
                type="email"
                placeholder="e.g. trang@phela.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/40 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Mã PIN Đăng nhập POS *
              </label>
              <Input
                placeholder="e.g. 8888"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="bg-background/40 text-xs font-mono text-center font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Ngày sinh
              </label>
              <Input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="bg-background/40 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Quyền Hạn ca trực *
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                className="w-full rounded-xl border border-border bg-background/50 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {roles.map((r) => (
                  <option key={r.RoleID} value={r.RoleID}>
                    {r.RoleName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
              Mật khẩu phụ (Để trống nếu giữ nguyên)
            </label>
            <Input
              type="password"
              placeholder="Nhập mật khẩu truy cập hệ thống quản trị"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/40"
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
              Đăng Ký
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
