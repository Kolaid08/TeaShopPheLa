'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Coffee,
  Layers,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  LogOut,
  ShoppingBag,
  Clock,
  FileText,
  UserCheck,
  UserX,
  Menu,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Session control redirect
    const activeUser = api.getCurrentUser();
    if (!activeUser && typeof window !== 'undefined') {
      const token = localStorage.getItem('phela_token');
      if (!token) {
        router.push('/login');
        return;
      }
    }
    setUser(activeUser);

    // Role-based route guard: block STAFF from admin paths
    if (activeUser && activeUser.Role === 'STAFF') {
      const staffAllowedPaths = ['/pos', '/orders', '/inventory/ingredients', '/shift-logs'];
      const isRestricted = !staffAllowedPaths.some((p) => pathname.startsWith(p));
      if (isRestricted) {
        toast.error('Tài khoản Barista (STAFF) không có quyền truy cập khu vực này.');
        router.push('/pos');
        return;
      }
    }

    // Fetch shiftlogs state for offline support
    const checkLogs = async () => {
      try {
        const logs = await api.getShiftLogs();
        const active = logs.find((l) => l.EmployeeID === activeUser?.EmployeeID && !l.CheckOutTime);
        setIsCheckedIn(!!active);
      } catch {}
    };
    if (activeUser) checkLogs();
  }, [pathname, router]);

  const handleLogout = async () => {
    await api.logout();
    toast.success('Đã đăng xuất tài khoản Barista thành công.');
    router.push('/login');
  };

  const handleCheckInOut = async () => {
    if (!isCheckedIn) {
      try {
        // default check-in to shift 1
        await api.checkIn(1);
        setIsCheckedIn(true);
        toast.success('Check-in ca làm việc thành công! Trạng thái Barista: Đang làm việc.');
      } catch (err: any) {
        toast.error(err.message || 'Lỗi Check-in ca làm việc.');
      }
    } else {
      try {
        await api.checkOut();
        setIsCheckedIn(false);
        toast.success('Check-out thành công. Hẹn gặp lại Barista!');
      } catch (err: any) {
        toast.error(err.message || 'Lỗi Check-out ca làm việc.');
      }
    }
  };

  const navLinks = [
    { name: 'Hoạt động cửa hàng', path: '/analytics', icon: TrendingUp, roles: ['ADMIN', 'MANAGER'] },
    { name: 'POS bán hàng', path: '/pos', icon: Coffee, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Hóa đơn & Đơn hàng', path: '/orders', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Đồ uống (Menu)', path: '/menu/drinks', icon: Layers, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Bảng giá (Drink Size)', path: '/menu/drink-sizes', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Kho nguyên liệu', path: '/inventory/ingredients', icon: Clock, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Hóa đơn nhập kho', path: '/inventory/receipts', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Nhà cung cấp', path: '/inventory/suppliers', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Hội viên (Loyalty)', path: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Tài khoản Barista', path: '/employees', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Tính lương (Salary)', path: '/salary', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Quản lý Rota & Công', path: '/shift-logs', icon: Calendar, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Header Banner */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Coffee className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-serif font-bold text-lg text-primary tracking-wide">PHÊLA</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-muted rounded-lg text-foreground"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`
        fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:flex lg:flex-col lg:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {/* Brand header */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-border/60 bg-muted/20">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Coffee className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-xl tracking-wider text-primary uppercase">
              Phêla
            </h1>
            <span className="text-[9px] block text-muted-foreground font-semibold tracking-widest uppercase">
              Southeast-Asian Café
            </span>
          </div>
        </div>

        {/* Barista Context Shifts check */}
        {user && (
          <div className="p-4 mx-4 my-4 rounded-xl border border-border/80 bg-background/50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Barista</span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
                <span
                  className={`h-2.5 w-2.5 rounded-full inline-block ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
                />
                {isCheckedIn ? 'Đang trực' : 'Ngoại tuyến'}
              </div>
            </div>
            <p className="text-sm font-bold truncate text-foreground">{user.FullName}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">{user.Role}</p>

            <button
              onClick={handleCheckInOut}
              className={`w-full mt-2 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 border transition-all ${
                isCheckedIn
                  ? 'bg-red-500/10 border-red-500/25 text-red-500 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/20'
              }`}
            >
              {isCheckedIn ? (
                <UserX className="w-3.5 h-3.5" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              {isCheckedIn ? 'Check-out ca' : 'Check-in ca trực'}
            </button>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {navLinks
            .filter((link) => {
              if (!user) return false;
              return link.roles.includes(user.Role);
            })
            .map((link) => {
              const Icon = link.icon;
            const active = pathname === link.path;
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-primary text-white shadow-md shadow-primary/10'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-primary'}`}
                />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout bottom */}
        <div className="p-4 border-t border-border bg-muted/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5 text-red-500" />
            Đăng xuất Barista
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden pt-16 lg:pt-0">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
