'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Check, DollarSign, Calendar, RefreshCcw } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/core';
import { api, Salary } from '@/lib/api';
import { toast } from 'sonner';

export default function SalaryPayroll() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Year/Month states
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const loadSalaries = async () => {
    try {
      const data = await api.getSalaries();
      setSalaries(data);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadSalaries();
  }, []);

  const handleGenerateSalaries = async () => {
    setIsGenerating(true);
    try {
      const list = await api.generateSalaries(month, year);
      toast.success(
        `Đã tự động tính toán & khởi tạo bảng lương tháng ${month}/${year} cho tất cả Barista.`,
      );
      loadSalaries();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khởi tạo bảng lương.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    if (
      !confirm(
        'Bạn có đồng ý phê duyệt chuyển khoản và đánh dấu đã chi trả thực lĩnh cho nhân sự này?',
      )
    )
      return;
    try {
      await api.paySalary(id);
      toast.success('Phê duyệt chi trả bảng lương thành công! Trạng thái: Đã thanh toán.');
      loadSalaries();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi chi trả lương.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif font-black text-3xl text-foreground tracking-tight">
            Tính Lương Barista (Payroll)
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest font-sans mt-1">
            Bảng tổng hợp công, thưởng, phạt và bảng lương thực lĩnh của đội ngũ cửa hàng
          </p>
        </div>

        {/* Generate triggers */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
          <Button
            onClick={handleGenerateSalaries}
            disabled={isGenerating}
            className="rounded-xl text-xs gap-1.5 font-serif uppercase tracking-wider font-extrabold"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} /> Tính
            lương tự động
          </Button>
        </div>
      </div>

      {/* Salary sheet table */}
      <Card className="cafe-panel p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Đang kết xuất bảng lương Barista...
          </div>
        ) : salaries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Calendar className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-semibold text-sm">Chưa có dữ liệu bảng lương được khởi tạo.</p>
            <p className="text-xs text-muted-foreground/70">
              Chọn Tháng/Năm và bấm 'Tính lương tự động' bên trên.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân Sự</TableHead>
                <TableHead>Kỳ Lương</TableHead>
                <TableHead>Lương Cơ Bản</TableHead>
                <TableHead>Tổng Giờ Công</TableHead>
                <TableHead>Thưởng + Phạt</TableHead>
                <TableHead>Lương Thực Lĩnh</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaries.map((sal) => (
                <TableRow key={sal.SalaryID}>
                  <TableCell className="font-serif font-bold text-base text-foreground tracking-tight">
                    {sal.Employee?.FullName}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                    Tháng {sal.Month} / {sal.Year}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">
                    {sal.BaseSalary.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    {sal.TotalHours} giờ
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="text-emerald-500 font-mono">
                      +{sal.Bonus.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-red-500 font-mono ml-2">
                      -{sal.Deduction.toLocaleString('vi-VN')}đ
                    </span>
                  </TableCell>
                  <TableCell className="font-extrabold font-mono text-primary text-base">
                    {sal.RealSalary.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    <Badge variant={sal.PaidDate ? 'success' : 'neutral'}>
                      {sal.PaidDate ? 'Đã chi trả' : 'Chờ duyệt'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!sal.PaidDate ? (
                      <Button
                        size="sm"
                        className="rounded-xl flex items-center gap-1 inline-flex text-xs"
                        onClick={() => handleMarkPaid(sal.SalaryID)}
                      >
                        <Check className="w-3.5 h-3.5" /> Chi Trả Lương
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono font-medium">
                        Trả: {new Date(sal.PaidDate).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
