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
  ShoppingCart,
  Coffee,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from '@/components/ui/core';
import { api } from '@/lib/api';

export default function DashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [aprioriRules, setAprioriRules] = useState<any[]>([]);
  const [huiCombos, setHuiCombos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isTriggeringApriori, setIsTriggeringApriori] = useState(false);

  const fetchAIResults = async () => {
    try {
      const [apriori, hui] = await Promise.all([
        api.getAprioriResults(),
        api.getHUIResults()
      ]);
      setAprioriRules(apriori);
      setHuiCombos(hui);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerHUI = async () => {
    setIsTriggering(true);
    try {
      await api.triggerHUI();
      alert('Đã chạy quá trình khai phá dữ liệu HUI ngầm thành công!');
      fetchAIResults();
    } catch (e: any) {
      alert(e.message || 'Có lỗi xảy ra khi gọi HUI');
    }
    setIsTriggering(false);
  };

  const handleTriggerApriori = async () => {
    setIsTriggeringApriori(true);
    try {
      await api.triggerApriori();
      alert('Đã cập nhật bộ luật Apriori thành công!');
      fetchAIResults();
    } catch (e: any) {
      alert(e.message || 'Có lỗi xảy ra khi gọi Apriori');
    }
    setIsTriggeringApriori(false);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch {}
      setIsLoading(false);
    };
    fetchStats();
    fetchAIResults();
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
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold px-4 py-2 rounded-xl bg-card border border-border flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Luồng dữ liệu đồng bộ
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleTriggerApriori}
              disabled={isTriggeringApriori}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Sparkles className="w-4 h-4" />
              {isTriggeringApriori ? 'Đang phân tích...' : 'Cập nhật Apriori AI'}
            </Button>
            <Button 
              variant="primary" 
              onClick={handleTriggerHUI}
              disabled={isTriggering}
              className="shadow-primary/20 gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isTriggering ? 'Đang phân tích...' : 'Cập nhật HUI AI'}
            </Button>
          </div>
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
          <CardContent className="h-64 flex flex-col justify-end pt-4 pb-2 relative">
            <div className="absolute inset-x-6 bottom-8 top-6 flex flex-col justify-between pointer-events-none opacity-20">
              {[1, 2, 3, 4, 5].map((line) => (
                <div key={line} className="w-full border-t border-dashed border-border" />
              ))}
            </div>

            <div className="absolute inset-x-8 bottom-8 top-6">
              {(() => {
                const maxVal = Math.max(...(stats.monthlyRevenueChart.length ? stats.monthlyRevenueChart.map((x: any) => x.revenue) : [1]));
                const chartHeight = 100;
                const chartWidth = 1000;
                const stepX = stats.monthlyRevenueChart.length > 1 ? chartWidth / (stats.monthlyRevenueChart.length - 1) : chartWidth;
                
                const points = stats.monthlyRevenueChart.map((m: any, i: number) => {
                  const x = i * stepX;
                  const y = maxVal > 0 ? chartHeight - (m.revenue / maxVal) * chartHeight : chartHeight;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`} fill="url(#lineGrad)" />
                      <polyline points={points} fill="none" stroke="#f59e0b" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {stats.monthlyRevenueChart.map((m: any, i: number) => {
                      const left = i === 0 ? 0 : (i / (stats.monthlyRevenueChart.length - 1)) * 100;
                      const bottom = maxVal > 0 ? (m.revenue / maxVal) * 100 : 0;
                      return (
                        <div 
                          key={i} 
                          className="absolute w-3.5 h-3.5 bg-white border-[3px] border-amber-500 rounded-full transform -translate-x-1/2 translate-y-1/2 group cursor-pointer hover:scale-150 transition-transform shadow-md z-10"
                          style={{ left: `${left}%`, bottom: `${bottom}%` }}
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-accent text-white text-[11px] font-mono px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                            {(m.revenue / 1000000).toFixed(1)}M đ
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            <div className="absolute bottom-1 left-8 right-8 flex justify-between">
              {stats.monthlyRevenueChart.map((m: any, i: number) => (
                <span key={i} className="text-[10px] text-muted-foreground font-bold mt-2 font-mono text-center w-8 -ml-4">
                  {m.month}
                </span>
              ))}
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

      {/* Expiring Ingredients alerting card */}
      <Card className="cafe-panel mt-6">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <div>
            <CardTitle>Cảnh báo Hạn sử dụng nguyên liệu</CardTitle>
            <CardDescription>
              Cảnh báo kho: các lô nguyên liệu đang đến gần hoặc đã vượt quá ngày hết hạn
            </CardDescription>
          </div>
          <Badge variant="warning">Cần kiểm tra</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {stats.expiringIngredients?.length > 0 ? (
              stats.expiringIngredients.map((ing: any) => {
                const daysUntilExp = Math.ceil((new Date(ing.ExpirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const isExpired = daysUntilExp < 0;
                
                return (
                  <div
                    key={ing.IngredientReceiptDetailID}
                    className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Clock className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{ing.Ingredient?.IngredientName || 'Nguyên liệu'}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                          Mã lô nhập: #{ing.IngredientReceiptID}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold font-mono ${isExpired ? 'text-red-500' : 'text-orange-500'}`}>
                        {new Date(ing.ExpirationDate).toLocaleDateString('vi-VN')}
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-semibold">
                        Tồn đọng: {ing.QuantityRemaining} • {isExpired ? 'Đã hết hạn' : `Còn ${daysUntilExp} ngày`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                Không có nguyên liệu nào sắp hết hạn trong 30 ngày tới.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Apriori Rules */}
        <Card className="cafe-panel shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5" /> Phân tích mua kèm
                </CardTitle>
                <CardDescription>
                  Luật kết hợp khai phá được từ các hóa đơn thực tế
                </CardDescription>
              </div>
              <Badge variant="info" className="font-mono">{aprioriRules.length} luật</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border/60">
              {aprioriRules.length > 0 ? (
                aprioriRules.map((rule, idx) => {
                  const ant = (rule.AntecedentItems || []).map((i: any) => `${i?.DrinkName} (${i?.SizeName})`);
                  const con = (rule.ConsequentItems || []).map((i: any) => `${i?.DrinkName} (${i?.SizeName})`);
                  return (
                    <div key={idx} className="p-4 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 p-2 bg-muted/40 rounded-lg text-sm font-semibold border border-border">
                          {ant.join(' + ')}
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 p-2 bg-primary/10 rounded-lg text-sm font-bold text-primary border border-primary/20">
                          {con.join(' + ')}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Độ tin cậy (Xác suất khách mua món bên trái sẽ mua thêm món bên phải)</span>
                        <span className="font-mono font-bold text-foreground">{(rule.Confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${rule.Confidence * 100}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Chưa có luật Apriori nào. Vui lòng bấm "Cập nhật Apriori AI".
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* HUI Combos */}
        <Card className="cafe-panel shadow-sm border-amber-200">
          <CardHeader className="border-b border-border/40 pb-4 bg-amber-50/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <Sparkles className="w-5 h-5" /> Combo Sinh Lời
                </CardTitle>
                <CardDescription>
                  Các tập hợp đồ uống mang lại tổng lợi nhuận cao nhất
                </CardDescription>
              </div>
              <Badge variant="warning" className="font-mono">{huiCombos.length} combo</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border/60">
              {huiCombos.length > 0 ? (
                huiCombos.map((combo, idx) => (
                  <div key={idx} className="p-4 hover:bg-amber-50/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
                          #{idx + 1}
                        </div>
                        <span className="font-semibold text-sm">Combo {combo.Items.length} món</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-0.5">Tổng giá trị</div>
                        <div className="font-mono font-bold text-amber-600">
                          {combo.TotalUtility.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {combo.Items.map((item: any, i: number) => (
                        <div key={i} className="px-2 py-1 bg-background border border-border rounded text-[11px] font-medium flex items-center gap-1 shadow-sm">
                          <Coffee className="w-3 h-3 text-muted-foreground" />
                          {item.DrinkName} ({item.SizeName})
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Chưa có Combo HUI nào. Vui lòng bấm "Cập nhật HUI AI".
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
