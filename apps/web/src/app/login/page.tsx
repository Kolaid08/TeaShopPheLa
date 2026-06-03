'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Key, ShieldCheck } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/core';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [pinCode, setPinCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNumClick = (num: string) => {
    if (pinCode.length < 6) {
      setPinCode((prev) => prev + num);
    }
  };

  const handleClear = () => {
    setPinCode('');
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinCode) {
      toast.error('Vui lòng nhập Mã PIN Barista.');
      return;
    }

    setIsLoading(true);
    try {
      await api.login(pinCode, password || undefined);
      toast.success('Đăng nhập cổng làm việc Phêla thành công!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Mã PIN hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative p-6 font-sans">
      {/* Editorial cafe gradients */}
      <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-primary/5 blur-[160px] rounded-full" />

      <Card className="w-full max-w-md p-8 cafe-panel shadow-2xl rounded-3xl relative border-border/80">
        {/* Core logo header */}
        <CardHeader className="text-center flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25 mb-4 group-hover:scale-105 transition-transform">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="font-serif font-black text-3xl tracking-wide uppercase text-primary">
            PHÊLA
          </CardTitle>
          <CardDescription className="font-sans font-medium text-xs tracking-wider text-muted-foreground uppercase mt-1">
            Cổng đăng nhập hệ thống Barista
          </CardDescription>
        </CardHeader>

        {/* Pin Input Display Screen */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-full text-center tracking-widest text-4xl font-bold h-12 flex items-center justify-center border-b border-border bg-muted/20 rounded-xl p-3 mb-2 font-mono">
            {pinCode ? (
              '*'.repeat(pinCode.length)
            ) : (
              <span className="text-muted-foreground/30 text-lg font-sans font-normal italic">
                Nhập mã PIN của bạn
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Dùng mã PIN Barista hoặc kèm mật
            khẩu
          </p>
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num)}
              className="h-14 rounded-xl border border-border bg-card hover:bg-primary/10 text-xl font-bold transition-all active:scale-95 text-foreground flex items-center justify-center font-mono"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-sm font-bold transition-all active:scale-95 flex items-center justify-center font-serif uppercase tracking-wider"
          >
            Clear
          </button>
          <button
            onClick={() => handleNumClick('0')}
            className="h-14 rounded-xl border border-border bg-card hover:bg-primary/10 text-xl font-bold transition-all active:scale-95 text-foreground flex items-center justify-center font-mono"
          >
            0
          </button>
          <button
            onClick={() => handleLoginSubmit()}
            disabled={isLoading}
            className="h-14 rounded-xl bg-primary hover:bg-orange-700 text-white text-sm font-extrabold transition-all active:scale-95 flex items-center justify-center font-serif uppercase tracking-widest"
          >
            OK
          </button>
        </div>

        {/* Password Backup Field */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 pt-4 border-t border-border/80">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Mật khẩu phụ (không bắt buộc)
            </label>
            <Input
              type="password"
              placeholder="Nhập mật khẩu nếu được cấu hình"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/40"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl py-3 font-serif uppercase tracking-widest font-extrabold"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập cổng chính'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
