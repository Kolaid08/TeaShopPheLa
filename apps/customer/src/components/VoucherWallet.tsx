'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, Copy, CheckCircle2, Gift } from 'lucide-react';
import { Button, Dialog, Badge } from '@/components/ui/core';
import { api, Voucher } from '@/lib/api';
import { toast } from 'sonner';

interface VoucherWalletProps {
  customerId: number;
}

export function VoucherWallet({ customerId }: VoucherWalletProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [publicVouchers, setPublicVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MY_VOUCHERS' | 'AVAILABLE'>('MY_VOUCHERS');

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const [myVouchersData, publicVouchersData] = await Promise.all([
        api.getCustomerVouchers(customerId),
        api.getPublicVouchers()
      ]);
      setVouchers(myVouchersData);
      
      // Lọc bỏ những public voucher đã có trong myVouchers
      const myVoucherIds = new Set(myVouchersData.map(v => v.VoucherID));
      setPublicVouchers(publicVouchersData.filter(v => !myVoucherIds.has(v.VoucherID)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchVouchers();
    }
  }, [isOpen, customerId]);

  useEffect(() => {
    const handleOpenWallet = () => setIsOpen(true);
    window.addEventListener('OPEN_VOUCHER_WALLET', handleOpenWallet);
    return () => window.removeEventListener('OPEN_VOUCHER_WALLET', handleOpenWallet);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Đã sao chép mã giảm giá!');
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleClaim = async (code: string) => {
    setClaimingCode(code);
    try {
      const success = await api.claimVoucher(code);
      if (success) {
        toast.success('Đã lưu mã giảm giá thành công!');
        fetchVouchers(); // Refresh cả 2 list
        setActiveTab('MY_VOUCHERS'); // Chuyển về tab ví của tôi
      } else {
        toast.error('Có lỗi xảy ra, hoặc mã đã hết lượt lưu!');
      }
    } finally {
      setClaimingCode(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors duration-300"
      >
        <Ticket className="w-4 h-4" />
        <span className="text-sm font-semibold whitespace-nowrap hidden sm:inline">Ví Voucher</span>
      </button>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Ví Voucher của bạn">
        <div className="flex border-b mb-4">
          <button 
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'MY_VOUCHERS' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('MY_VOUCHERS')}
          >
            Mã Của Tôi ({vouchers.length})
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'AVAILABLE' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('AVAILABLE')}
          >
            Mã Có Thể Lưu {publicVouchers.length > 0 && <span className="ml-1 bg-destructive text-white text-[10px] px-1.5 py-0.5 rounded-full">{publicVouchers.length}</span>}
          </button>
        </div>

        <div className="p-4 sm:p-6 pt-0 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activeTab === 'MY_VOUCHERS' ? (
            vouchers.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
                <p className="text-muted-foreground font-medium">Bạn chưa có mã giảm giá nào.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vouchers.map((voucher) => (
                  <div 
                    key={voucher.VoucherID} 
                    className={`flex flex-col sm:flex-row gap-4 p-4 border rounded-xl transition-colors shadow-sm relative overflow-hidden ${
                      voucher.Status === 'INACTIVE' 
                        ? 'border-border/30 bg-muted/30 opacity-70 grayscale' 
                        : 'border-border/50 bg-card hover:border-primary/30'
                    }`}
                  >
                    {voucher.Status === 'INACTIVE' && (
                      <div className="absolute top-0 right-0 bg-destructive/80 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10">
                        VÔ HIỆU HÓA / ĐÃ THU HỒI
                      </div>
                    )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg text-primary uppercase tracking-wider">{voucher.Code}</h4>
                      <Badge variant="warning" className="bg-primary/5 text-primary border-primary/20">
                        Giảm {voucher.DiscountType === 'PERCENT' ? `${voucher.DiscountValue}%` : `${voucher.DiscountValue.toLocaleString('vi-VN')}đ`}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium text-foreground">Hạn sử dụng:</span> {formatDate(voucher.ValidUntil)}
                      </p>
                      {voucher.DrinkSize && voucher.DrinkSize.Drink && (
                        <p>
                          <span className="font-medium text-foreground">Áp dụng cho:</span> {voucher.DrinkSize.Drink.DrinkName} ({voucher.DrinkSize.Size?.SizeName})
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-foreground">Đã dùng:</span> {voucher.UsedCount} / {voucher.MaxUsage}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col items-center justify-center gap-2 sm:border-l sm:border-border/50 sm:pl-4 pt-4 sm:pt-0 border-t border-border/50 mt-2 sm:mt-0">
                    <Button 
                      variant={copiedCode === voucher.Code ? "outline" : "primary"} 
                      size="sm" 
                      disabled={voucher.Status === 'INACTIVE'}
                      onClick={() => handleCopy(voucher.Code)}
                      className="w-full sm:w-auto min-w-[120px]"
                    >
                      {copiedCode === voucher.Code ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Đã chép
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Sao chép mã
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )) : (
            // AVAILABLE VOUCHERS TAB
            publicVouchers.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
                <p className="text-muted-foreground font-medium">Hiện tại không có mã giảm giá nào mới.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {publicVouchers.map((voucher) => (
                    <div 
                      key={voucher.VoucherID} 
                      className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl transition-colors shadow-sm relative overflow-hidden border-border/50 bg-card hover:border-primary/30"
                    >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-primary uppercase tracking-wider">{voucher.Code}</h4>
                        <Badge variant="warning" className="bg-primary/5 text-primary border-primary/20">
                          Giảm {voucher.DiscountType === 'PERCENT' ? `${voucher.DiscountValue}%` : `${voucher.DiscountValue.toLocaleString('vi-VN')}đ`}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium text-foreground">Hạn sử dụng:</span> {formatDate(voucher.ValidUntil)}
                        </p>
                        {voucher.DrinkSize && voucher.DrinkSize.Drink && (
                          <p>
                            <span className="font-medium text-foreground">Áp dụng cho:</span> {voucher.DrinkSize.Drink.DrinkName} ({voucher.DrinkSize.Size?.SizeName})
                          </p>
                        )}
                        <p>
                          <span className="font-medium text-foreground">Đã dùng:</span> {voucher.UsedCount} / {voucher.MaxUsage}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-col items-center justify-center gap-2 sm:border-l sm:border-border/50 sm:pl-4 pt-4 sm:pt-0 border-t border-border/50 mt-2 sm:mt-0">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleClaim(voucher.Code)}
                        disabled={claimingCode === voucher.Code}
                        className="w-full sm:w-auto min-w-[120px]"
                      >
                        {claimingCode === voucher.Code ? 'Đang lưu...' : 'Lưu Mã'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Dialog>
    </>
  );
}
