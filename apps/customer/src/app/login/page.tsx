'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Coffee, Phone, User, ShieldCheck, Lock, LogIn, UserPlus } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/core';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If there's a refParam, user likely wants to register
  React.useEffect(() => {
    if (refParam) {
      setMode('register');
    }
  }, [refParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      toast.error('Vui lòng nhập SĐT và Mật khẩu.');
      return;
    }

    if (phoneNumber.length < 8) {
      toast.error('Số điện thoại không hợp lệ.');
      return;
    }

    if (mode === 'register') {
      if (!fullName) {
        toast.error('Vui lòng nhập Họ và tên.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Mật khẩu nhập lại không khớp.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const customer = await api.customerLogin(phoneNumber, password);
        toast.success(`Chào mừng ${customer.CustomerName} trở lại!`);
        router.push('/');
      } else {
        const customer = await api.customerRegister(phoneNumber, fullName, password, refParam || undefined);
        toast.success(`Đăng ký thành công! Chào mừng ${customer.CustomerName}.`);
        router.push('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xác thực.');
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
        <CardHeader className="text-center flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25 mb-4 hover:scale-105 transition-transform duration-300">
            <Coffee className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="font-serif font-black text-3xl tracking-wide uppercase text-primary">PHÊLA</CardTitle>
          <CardDescription className="font-sans font-medium text-xs tracking-wider text-muted-foreground uppercase mt-1">Cổng Mua Sắm & Tích Điểm Hội Viên</CardDescription>
        </CardHeader>

        {/* Tab selector */}
        <div className="flex bg-muted/50 p-1 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'login' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LogIn className="w-4 h-4" /> Đăng nhập
          </button>
          <button 
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'register' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <UserPlus className="w-4 h-4" /> Đăng ký
          </button>
        </div>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Số điện thoại *
            </label>
            <Input
              type="text"
              placeholder="Nhập số điện thoại..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
              className="bg-background/40 font-mono text-base"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Họ và tên *
                </label>
                <Input
                  type="text"
                  placeholder="Nhập tên của bạn..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-background/40"
                  required
                />
              </div>

            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Mật khẩu *
            </label>
            <Input
              type="password"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/40 font-mono text-base"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Nhập lại Mật khẩu *
              </label>
              <Input
                type="password"
                placeholder="Xác nhận mật khẩu..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-background/40 font-mono text-base"
                required
              />
            </div>
          )}

          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-2 bg-primary/5 p-2.5 rounded-lg border border-primary/10">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> 
            <span>{mode === 'login' ? 'Tài khoản cũ chưa có mật khẩu có thể thử mật khẩu mặc định 123456.' : 'Thông tin của bạn được bảo mật an toàn tuyệt đối.'}</span>
          </p>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl py-3.5 mt-4 font-serif uppercase tracking-widest font-extrabold text-white text-sm shadow-md shadow-primary/20"
          >
            {isLoading ? 'Đang xác thực...' : (mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản')}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
