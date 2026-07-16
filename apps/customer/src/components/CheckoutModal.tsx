import React from 'react';
import { Dialog, Button } from '@/components/ui/core';
import { ShoppingBag } from 'lucide-react';
import { Customer } from '@/lib/api';

interface CheckoutModalProps {
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  paymentMethod: 'COD' | 'QR_CODE';
  setPaymentMethod: (method: 'COD' | 'QR_CODE') => void;
  payOsQrCode: string;
  setPayOsQrCode: (qr: string) => void;
  payOsDetails: { accountNumber?: string; description?: string; bin?: string; amount?: number } | null;
  setPayOsDetails: (details: any) => void;
  isPolling: boolean;
  setIsPolling: (polling: boolean) => void;
  isSubmittingOrder: boolean;
  handlePlaceOrder: (method: 'COD' | 'QR_CODE') => void;
  customer: Customer | null;
  getTotalPrice: () => number;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isCheckoutOpen,
  setIsCheckoutOpen,
  paymentMethod,
  setPaymentMethod,
  payOsQrCode,
  setPayOsQrCode,
  payOsDetails,
  setPayOsDetails,
  isPolling,
  setIsPolling,
  isSubmittingOrder,
  handlePlaceOrder,
  customer,
  getTotalPrice
}) => {
  if (!isCheckoutOpen) return null;

  return (
    <Dialog
      isOpen={isCheckoutOpen}
      onClose={() => setIsCheckoutOpen(false)}
      title="Xác nhận thanh toán đơn hàng"
    >
      <div className="space-y-6 text-center">
        <p className="text-xs text-muted-foreground">Chọn phương thức thanh toán để kết toán hóa đơn order:</p>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Payment Option 1: Cash/COD */}
          <button
            onClick={() => setPaymentMethod('COD')}
            className={`border rounded-2xl p-5 flex flex-col items-center justify-between gap-3 transition-all ${
              paymentMethod === 'COD' 
                ? 'border-orange-500 bg-orange-500/10 shadow-sm' 
                : 'border-border bg-background/50 hover:bg-muted/30'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'COD' ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-600'}`}>
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <span className={`font-bold text-sm block ${paymentMethod === 'COD' ? 'text-orange-600' : 'text-foreground'}`}>Thanh Toán Tiền Mặt</span>
              <span className="text-[10px] text-muted-foreground block mt-1">Trả tiền tại quầy</span>
            </div>
          </button>

          {/* Payment Option 2: Bank Transfer (QR) */}
          <button 
            onClick={() => setPaymentMethod('QR_CODE')}
            className={`border rounded-2xl p-5 flex flex-col items-center justify-between gap-3 transition-all ${
              paymentMethod === 'QR_CODE' 
                ? 'border-primary bg-primary/10 shadow-sm' 
                : 'border-border bg-background/50 hover:bg-muted/30'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'QR_CODE' ? 'bg-primary text-white' : 'bg-primary/20 text-primary'}`}>
              <span className="font-black text-xl">QR</span>
            </div>
            <div>
              <span className={`font-bold text-sm block ${paymentMethod === 'QR_CODE' ? 'text-primary' : 'text-foreground'}`}>Chuyển khoản VietQR</span>
              <span className="text-[10px] text-muted-foreground block mt-1">Quét mã nhận đơn ngay</span>
            </div>
          </button>
        </div>

        {/* VietQR Dynamic QR code visual mockup */}
        {paymentMethod === 'QR_CODE' && (
          <div className="mt-4 p-4 border border-border/50 rounded-2xl bg-muted/20 flex items-center gap-4 text-left animate-in fade-in zoom-in-95">
            <div className="w-24 h-24 bg-white rounded-xl p-2 border border-border flex items-center justify-center shrink-0">
              <img src={payOsQrCode ? (payOsQrCode.startsWith('http') ? payOsQrCode : `https://quickchart.io/qr?text=${encodeURIComponent(payOsQrCode)}&size=200`) : `https://img.vietqr.io/image/mbbank-7414012005-compact2.png?amount=${getTotalPrice()}&addInfo=PHELA${customer?.PhoneNumber?.slice(-4) || '9999'}&accountName=NGUYEN%20VAN%20KHOA`} alt="VietQR" className="w-full h-full object-contain" />
            </div>
            <div className="text-xs space-y-1.5 flex-1">
              {isPolling ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 py-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-bold text-primary animate-pulse">Đang chờ quét mã...</p>
                </div>
              ) : (
                <>
                  <p className="font-bold text-foreground">Thông tin chuyển khoản nhanh:</p>
                  <p>Ngân hàng: <span className="font-mono text-primary font-bold">{payOsDetails?.bin === '970422' ? 'MBBank' : (payOsDetails?.bin || 'MBBank')}</span></p>
                  <p>Số tài khoản: <span className="font-mono text-primary font-bold">{payOsDetails?.accountNumber || '7414012005'}</span></p>
                  <p>Chủ tài khoản: <span className="font-mono text-primary font-bold">NGUYEN VAN KHOA</span></p>
                  <p>Số tiền: <span className="font-mono text-primary font-bold">{(payOsDetails?.amount || getTotalPrice()).toLocaleString('vi-VN')} đ</span></p>
                  <p>Nội dung CK: <span className="font-mono text-primary font-bold">{payOsDetails?.description || `PHELA${customer?.PhoneNumber?.slice(-4) || '9999'}`}</span></p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 py-3.5 rounded-xl text-xs font-bold"
            onClick={() => {
              setIsCheckoutOpen(false);
              setIsPolling(false);
              setPayOsQrCode('');
              setPayOsDetails(null);
            }}
          >
            {isPolling ? 'Hủy giao dịch' : 'Hủy'}
          </Button>
          {!isPolling && (
            <Button 
              className="flex-[2] py-3.5 rounded-xl text-xs font-bold text-white font-serif uppercase tracking-wider"
              onClick={() => handlePlaceOrder(paymentMethod)}
              disabled={isSubmittingOrder}
            >
              {isSubmittingOrder ? 'Đang tạo đơn...' : 'Xác nhận Đơn hàng'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
