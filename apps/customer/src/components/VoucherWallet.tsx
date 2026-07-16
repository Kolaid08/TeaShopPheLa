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
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCustomerVouchers(customerId);
      setVouchers(data);
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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Đã sao chép mã giảm giá!');
    setTimeout(() => setCopiedCode(null), 3000);
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
        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
              <p className="text-muted-foreground font-medium">Bạn chưa có mã giảm giá nào.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vouchers.map((voucher) => (
                <div 
                  key={voucher.VoucherID} 
                  className="flex flex-col sm:flex-row gap-4 p-4 border border-border/50 rounded-xl bg-card hover:border-primary/30 transition-colors shadow-sm"
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
                      variant={copiedCode === voucher.Code ? "outline" : "primary"} 
                      size="sm" 
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
          )}
        </div>
      </Dialog>
    </>
  );
}
