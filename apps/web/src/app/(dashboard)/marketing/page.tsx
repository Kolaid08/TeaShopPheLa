'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { BellRing, Send, Sparkles, Filter, Users, Gift, Coffee } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketingBroadcastPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('PROMOTION');
  const [voucherCode, setVoucherCode] = useState('');
  const [targetLevelId, setTargetLevelId] = useState<number | ''>('');
  const [isSending, setIsSending] = useState(false);
  const [levels, setLevels] = useState<any[]>([]);

  // Lấy danh sách hạng thành viên để lọc
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/customers/levels`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('phela_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLevels(data.data);
        }
      })
      .catch(err => console.error('Error fetching levels:', err));
  }, []);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    if (type === 'VOUCHER_DROP' && !voucherCode.trim()) {
      toast.error('Vui lòng nhập mã Voucher để thả.');
      return;
    }

    setIsSending(true);
    try {
      const token = localStorage.getItem('phela_token');
      const payload = {
        Title: title,
        Body: body,
        Type: type,
        VoucherCode: voucherCode || undefined,
        TargetLevelID: targetLevelId !== '' ? Number(targetLevelId) : null
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/marketing/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Gửi chiến dịch thành công!');
        setTitle('');
        setBody('');
        setVoucherCode('');
      } else {
        toast.error(data.message || 'Lỗi khi gửi thông báo.');
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 pb-24 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BellRing className="w-6 h-6 text-primary" />
            Chiến Dịch Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Gửi thông báo đẩy và thả quà tặng trực tiếp tới khách hàng.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cấu hình nội dung */}
        <Card className="p-6 space-y-6 shadow-sm border border-border">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Loại Chiến Dịch</label>
              <div className="flex gap-4">
                <Button 
                  variant={type === 'PROMOTION' ? 'primary' : 'outline'}
                  onClick={() => setType('PROMOTION')}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Sản phẩm / Tin tức
                </Button>
                <Button 
                  variant={type === 'VOUCHER_DROP' ? 'primary' : 'outline'}
                  onClick={() => setType('VOUCHER_DROP')}
                  className="flex-1"
                  style={type === 'VOUCHER_DROP' ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' } : {}}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Thả Voucher
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                Đối tượng khách hàng
              </label>
              <select 
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={targetLevelId}
                onChange={(e) => setTargetLevelId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">-- Tất cả khách hàng --</option>
                {levels.map(l => (
                  <option key={l.LevelID} value={l.LevelID}>{l.LevelName} (Chiết khấu {l.DiscountRate}%)</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium mb-1.5 block">Tiêu đề</label>
              <Input 
                placeholder="VD: Phê La ra mắt món mới!" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Nội dung chi tiết</label>
              <textarea 
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Nội dung truyền thông..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {type === 'VOUCHER_DROP' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <label className="text-sm font-medium mb-1.5 block text-amber-600 flex items-center gap-2">
                  Mã Voucher đính kèm
                </label>
                <Input 
                  placeholder="VD: PHELA50K" 
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="border-amber-500/30 bg-amber-500/5 focus-visible:ring-amber-500"
                />
              </div>
            )}
          </div>

          <Button 
            className="w-full py-6 text-lg font-bold shadow-lg"
            onClick={handleBroadcast}
            disabled={isSending}
            variant="primary"
          >
            {isSending ? 'Đang phát sóng...' : 'BẮN THÔNG BÁO BÂY GIỜ'}
            <Send className="w-5 h-5 ml-2" />
          </Button>
        </Card>

        {/* Demo Hiển thị */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Mô phỏng hiển thị
          </h3>
          
          <div className="p-4 rounded-[2rem] border-[8px] border-black bg-white aspect-[9/19] max-w-[300px] mx-auto shadow-2xl relative overflow-hidden flex flex-col">
            {/* Fake Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
            
            {/* Fake Push Notification (Lockscreen style) */}
            <div className="mt-12 bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm p-3 rounded-2xl animate-in slide-in-from-top-4 relative z-10 mx-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                  <Coffee className="w-3 h-3 text-white" />
                </div>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Phê La</span>
                <span className="text-[10px] text-gray-400 ml-auto">Bây giờ</span>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight mb-0.5">{title || 'Tiêu đề thông báo'}</p>
              <p className="text-xs text-gray-600 line-clamp-2">{body || 'Nội dung thông báo sẽ hiển thị ở đây.'}</p>
            </div>

            {/* Fake In-app Realtime Voucher Drop */}
            {type === 'VOUCHER_DROP' && (
              <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="bg-amber-500 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-amber-500/20 animate-bounce">
                  <Gift className="w-10 h-10 text-white" />
                </div>
                <h4 className="text-white font-bold text-xl mb-2">{title || 'Bạn nhận được 1 Voucher!'}</h4>
                <p className="text-white/80 text-sm mb-6">{body || 'Chạm vào để thu thập.'}</p>
                <div className="bg-white px-6 py-3 rounded-full border-2 border-dashed border-amber-500 font-bold text-amber-600 shadow-lg">
                  MÃ: {voucherCode || 'CODE_HERE'}
                </div>
              </div>
            )}
            
            {/* Fake Background elements */}
            <div className="flex-1 bg-gray-50 mt-4 rounded-xl p-4 flex flex-col gap-3 opacity-50 relative z-0">
               <div className="w-full h-24 bg-gray-200 rounded-xl"></div>
               <div className="w-full h-12 bg-gray-200 rounded-xl"></div>
               <div className="w-full h-12 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
