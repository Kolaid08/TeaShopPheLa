'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/ui/core';
import { api } from '@/lib/api';

export default function DashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch {}
      setIsLoading(false);
    };
    fetchStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="flex-1 flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 w-48 bg-muted rounded-xl mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="h-80 bg-muted rounded-2xl" />
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Giám sát thời gian thực
          </div>
          <h2 className="font-serif font-black text-3xl md:text-4xl text-foreground tracking-tight">
            Tổng quan hoạt động
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-widest font-sans">
            Phêla Café Location #1
          </p>
        </div>
        <div className="text-sm font-semibold px-4 py-2 rounded-xl bg-card border border-border flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          Luồng dữ liệu đồng bộ
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 - Revenue */}
        <Card className="hover:border-primary/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Doanh thu hôm nay
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {stats.todayRevenue.toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +12.4% so với hôm qua
          </p>
        </Card>

        {/* KPI 2 - Total Orders */}
        <Card className="hover:border-primary/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tổng đơn hàng
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {stats.todayOrdersCount} đơn
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">
            Đang phục vụ: 3 bàn
          </p>
        </Card>

        {/* KPI 3 - Low Stock Alerts */}
        <Card className="hover:border-primary/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Nguyên liệu cảnh báo
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {stats.lowStockCount} loại
          </div>
          <p className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5 mt-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Yêu cầu nhập kho gấp
          </p>
        </Card>

        {/* KPI 4 - Staff on Duty */}
        <Card className="hover:border-primary/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Barista trực ca
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            2 nhân sự
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">
            Ca sáng (08:00 - 12:00)
          </p>
        </Card>
      </div>

      {/* Dynamic Data Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1 - Revenue Growth Curve */}
        <Card className="cafe-panel">
          <CardHeader>
            <CardTitle>Đường cong doanh thu</CardTitle>
            <CardDescription>Số liệu doanh thu được tổng hợp theo tháng qua</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-end pt-4">
            <div className="flex-1 flex items-end justify-between gap-2 px-2 relative">
              {/* Grid Lines */}
              <div className="absolute inset-x-0 bottom-0 h-full flex flex-col justify-between pointer-events-none opacity-20">
                {[1, 2, 3, 4].map((line) => (
                  <div key={line} className="w-full border-t border-dashed border-border" />
                ))}
              </div>

              {stats.monthlyRevenueChart.map((m: any, i: number) => {
                const maxVal = Math.max(...stats.monthlyRevenueChart.map((x: any) => x.revenue));
                const heightPct = maxVal > 0 ? (m.revenue / maxVal) * 80 : 10;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative z-10">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-primary to-orange-400 group-hover:from-orange-400 group-hover:to-orange-300 transition-all duration-300 relative shadow-lg shadow-primary/10"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-mono px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {(m.revenue / 1000000).toFixed(1)}M đ
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold mt-2 font-mono">
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2 - Best selling drinks */}
        <Card className="cafe-panel">
          <CardHeader>
            <CardTitle>Top 5 đồ uống bán chạy</CardTitle>
            <CardDescription>Xếp hạng sản phẩm có lượng tiêu thụ lớn nhất hôm nay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.bestSellers.map((item: any, i: number) => {
              const maxSold = Math.max(...stats.bestSellers.map((x: any) => x.TotalSold));
              const widthPct = maxSold > 0 ? (item.TotalSold / maxSold) * 100 : 10;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">
                      {item.DrinkName} ({item.SizeName})
                    </span>
                    <span className="text-primary font-mono">{item.TotalSold} ly</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 shadow-inner"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock alerting card */}
      <Card className="cafe-panel">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <div>
            <CardTitle>Cảnh báo mức độ an toàn của nguyên liệu</CardTitle>
            <CardDescription>
              Cảnh báo kho: các mặt hàng nguyên liệu có số lượng tồn kho giảm mạnh dưới mức tối
              thiểu
            </CardDescription>
          </div>
          <Badge variant="warning">Yêu cầu nhập thêm</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {stats.lowStockAlerts.map((ing: any) => (
              <div
                key={ing.IngredientID}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{ing.IngredientName}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                      Đơn vị: {ing.Unit?.UnitName || 'Gram'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-500 font-mono">
                    {ing.QuantityStock} {ing.Unit?.UnitName || 'g'}
                  </div>
                  <span className="text-[10px] text-muted-foreground block font-semibold">
                    Mức báo động: &lt; 10
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
