'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Phone, User, ShieldCheck } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/core';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Vui lòng nhập Số điện thoại để tiếp tục.');
      return;
    }

    if (phoneNumber.length < 8) {
      toast.error('Số điện thoại không hợp lệ (tối thiểu 8 ký tự).');
      return;
    }

    setIsLoading(true);
    try {
      const customer = await api.customerLogin(phoneNumber, fullName || undefined);
      toast.success(`Chào mừng ${customer.CustomerName} đến với Phêla!`);
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi đăng nhập cổng hội viên.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative p-6 font-sans">
      {/* Background radial gradients */}
      <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-primary/5 blur-[160px] rounded-full" />

      <Card className="w-full max-w-md p-8 cafe-panel shadow-2xl rounded-3xl relative border-border/80 bg-card/75">
        
        {/* Core logo header */}
        <CardHeader className="text-center flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25 mb-4 hover:scale-105 transition-transform duration-300">
            <Coffee className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="font-serif font-black text-3xl tracking-wide uppercase text-primary">PHÊLA</CardTitle>
          <CardDescription className="font-sans font-medium text-xs tracking-wider text-muted-foreground uppercase mt-1">Cổng Mua Sắm & Tích Điểm Hội Viên</CardDescription>
        </CardHeader>

        {/* Auth form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Số điện thoại hội viên *
            </label>
            <Input
              type="text"
              placeholder="Nhập số điện thoại của bạn..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
              className="bg-background/40 font-mono text-base"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Họ và tên (Cho lần đầu đăng ký)
            </label>
            <Input
              type="text"
              placeholder="Nhập tên của bạn để tích điểm..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-background/40"
            />
          </div>

          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-2 bg-primary/5 p-2.5 rounded-lg border border-primary/10">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> 
            <span>Nhập số điện thoại để đăng nhập. Nếu số chưa tồn tại, hệ thống sẽ tự động tạo tài khoản hội viên mới miễn phí.</span>
          </p>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl py-3.5 mt-4 font-serif uppercase tracking-widest font-extrabold text-white text-sm"
          >
            {isLoading ? 'Đang xác thực...' : 'Vào Cửa Hàng & Tích Điểm'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
