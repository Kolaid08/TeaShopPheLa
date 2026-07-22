import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { Button, Badge, Dialog } from '@/components/ui/core';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { onMessageListener, requestForToken } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export function NotificationBell({ customerId }: { customerId: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!customerId) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.IsRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchNotifications();
      
      // Request FCM Token and register it to Backend
      requestForToken().then((token) => {
        if (token) {
          api.registerNotificationToken(token, 'WEB').catch(console.error);
        }
      });
    }
  }, [customerId]);

  // Listen to Foreground messages
  useEffect(() => {
    const listenToMessages = async () => {
      try {
        const payload: any = await onMessageListener();
        if (payload) {
          toast.success(`🔔 ${payload.notification?.title}`, {
            description: payload.notification?.body,
            duration: 5000,
          });
          // Refresh the bell list
          fetchNotifications();
        }
      } catch (err) {
        console.error('Error listening to foreground messages', err);
      }
    };
    
    // Call it continuously
    const interval = setInterval(listenToMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      fetchNotifications();
    } catch (err) {
      toast.error('Có lỗi xảy ra.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      fetchNotifications();
      toast.success('Đã đánh dấu đọc tất cả.');
    } catch (err) {
      toast.error('Có lỗi xảy ra.');
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.IsRead) {
      await handleMarkAsRead(notif.NotificationID);
    }
    if (notif.ActionLink) {
      setIsOpen(false);
      if (notif.ActionLink === '/vouchers') {
        window.dispatchEvent(new CustomEvent('OPEN_VOUCHER_WALLET'));
      } else {
        router.push(notif.ActionLink);
      }
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative rounded-xl p-2 text-primary hover:bg-primary/10"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Thông báo của bạn"
      >
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-2 border-b border-border">
            <span className="text-sm font-semibold text-muted-foreground">
              {unreadCount} chưa đọc
            </span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary font-bold hover:bg-primary/10 h-7"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              Bạn chưa có thông báo nào.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((notif) => (
                <div
                  key={notif.NotificationID}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                    notif.IsRead
                      ? 'bg-muted/30 border-transparent text-muted-foreground'
                      : 'bg-primary/5 border-primary/20 text-foreground'
                  }`}
                >
                  {!notif.IsRead && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                  <h4 className="font-bold text-sm pr-6 mb-1">{notif.Title}</h4>
                  <p className="text-xs leading-relaxed opacity-90">{notif.Body}</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-medium opacity-60">
                      {new Date(notif.createdAt).toLocaleString('vi-VN')}
                    </span>
                    {notif.ActionLink && (
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                        Xem chi tiết <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
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
