'use client';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { Gift, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalMarketingListener() {
  const [showVoucherDrop, setShowVoucherDrop] = useState(false);
  const [voucherPayload, setVoucherPayload] = useState<any>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    if (!voucherPayload?.voucherCode) return;
    setIsClaiming(true);
    try {
      const token = localStorage.getItem('phela_customer_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://teashopphela.onrender.com/api/v1'}/vouchers/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ Code: voucherPayload.voucherCode })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowVoucherDrop(false);
      } else {
        toast.error(data.message || 'Lỗi khi lưu mã');
        // Vẫn đóng popup nếu lỗi (ví dụ: đã lưu rồi, hoặc hết hạn)
        setShowVoucherDrop(false);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu mã');
    } finally {
      setIsClaiming(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('phela_customer_token') : null;
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'https://teashopphela.onrender.com');
    socket.emit('customer_join', { token });

    socket.on('marketing_broadcast', (payload: any) => {
      // payload = { title, body, type, voucherCode }
      if (payload.type === 'VOUCHER_DROP') {
        // Rơi Hộp Quà (Voucher Drop)
        setVoucherPayload(payload);
        setShowVoucherDrop(true);

        try {
          // Play Tada sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3');
          audio.play().catch(e => console.log('Audio error:', e));
        } catch (e) {}
      } else {
        // Thông báo Sản phẩm / Tin tức (Promotion)
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.log('Audio error:', e));
        } catch (e) {}

        toast(payload.title, {
          description: payload.body,
          icon: <Sparkles className="w-5 h-5 text-primary" />,
          duration: 10000,
          position: 'top-center',
          style: {
            background: '#FDF8F3',
            color: '#1A1A1A',
            border: '2px solid #E9DDCF',
            borderRadius: '16px',
            padding: '16px'
          }
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <AnimatePresence>
      {showVoucherDrop && voucherPayload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.5, y: -200, rotate: -20 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 100 }}
            className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
          >
            {/* Vòng sáng background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
            
            <button 
              onClick={() => setShowVoucherDrop(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-2 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-inner relative z-10"
            >
              <Gift className="w-12 h-12 text-orange-500" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-2 relative z-10">
              {voucherPayload.title || 'Món Quà Bất Ngờ!'}
            </h2>
            <p className="text-white/90 text-sm mb-8 relative z-10">
              {voucherPayload.body || 'Bạn vừa nhận được một ưu đãi đặc biệt từ Phê La.'}
            </p>

            <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-dashed border-orange-200 relative z-10 transform -rotate-1">
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Mã Giảm Giá Của Bạn</p>
              <div className="text-2xl font-black text-orange-600 font-mono tracking-widest">
                {voucherPayload.voucherCode || 'PHELA-GIFT'}
              </div>
            </div>

            <button 
              onClick={handleClaim}
              disabled={isClaiming}
              className="mt-6 w-full py-4 bg-white text-orange-600 font-bold rounded-xl shadow-md hover:bg-orange-50 transition-colors relative z-10 disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {isClaiming ? (
                <>
                  <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                  Đang lưu...
                </>
              ) : (
                'LƯU MÃ NGAY'
              )}
            </button>
            <button 
              onClick={() => setShowVoucherDrop(false)}
              className="mt-3 text-white/80 hover:text-white text-sm relative z-10 underline"
            >
              Để sau
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
