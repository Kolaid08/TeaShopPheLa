'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bot, Headset, User, Send, CheckCircle2, Clock, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function LiveChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Combos
  const [combos, setCombos] = useState<any[]>([]);
  const [showComboMenu, setShowComboMenu] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch combos once
    fetch('http://localhost:3001/api/v1/promotions/chatbox-combos')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setCombos(data.data);
        }
      })
      .catch(err => console.error("Error fetching combos:", err));

    // 1. Fetch initial sessions
    fetch('http://localhost:3001/api/v1/chat/admin/sessions', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('phela_token')}`,
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setSessions(data.data);
        }
      })
      .catch(err => console.error("Error fetching sessions:", err));

    // 2. Setup socket
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'http://localhost:3001', { withCredentials: true });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('admin_join', { token: localStorage.getItem('phela_token') });
    });

    newSocket.on('new_message_in_session', ({ sessionId, message }) => {
      // Update session list preview
      setSessions(prev => prev.map(s => {
        if (s.SessionID === sessionId) {
          return { ...s, Messages: [message], updatedAt: new Date().toISOString() };
        }
        return s;
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));

      // Update active messages if viewing this session
      setActiveSessionId(currentActive => {
        if (currentActive === sessionId) {
          setMessages(prev => {
            if (prev.some(m => m.MessageID === message.MessageID)) return prev;
            return [...prev, message];
          });
        }
        return currentActive;
      });
    });

    newSocket.on('refresh_sessions', () => {
      fetch('http://localhost:3001/api/v1/chat/admin/sessions')
        .then(res => res.json())
        .then(data => {
          if (data.data) setSessions(data.data);
        });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    const sessionData = sessions.find(s => s.SessionID === sessionId);
    const customerId = sessionData?.Customer?.CustomerID || sessionData?.CustomerID || '';

    // Fetch full history for this session
    fetch(`http://localhost:3001/api/v1/chat/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const dbMessages = data.data.Messages || [];
          
          let comboEndpoint = 'http://localhost:3001/api/v1/promotions/chatbox-combos';
          if (customerId) comboEndpoint += `?customerId=${customerId}`;
          
          fetch(comboEndpoint)
            .then(res => res.json())
            .then(promoData => {
              let systemMsgs: any[] = [];
              if (promoData.data && Array.isArray(promoData.data)) {
                 systemMsgs = promoData.data.map((p: any) => {
                    const isPercent = p.DiscountType === 'PERCENT';
                    const val = isPercent ? `Giảm ${p.DiscountValue}%` : `Giảm ${Number(p.DiscountValue).toLocaleString('vi-VN')}đ`;
                    const condition = p.MinOrderValue ? ` (Đơn từ ${Number(p.MinOrderValue).toLocaleString('vi-VN')}đ)` : '';
                    const btn = p.TargetDrinkIDs ? `[ADD_COMBO:${JSON.parse(p.TargetDrinkIDs || '[]').join(',')}]` : 'Nhập mã để nhận';
                    
                    return {
                      SenderType: 'SYSTEM',
                      Content: `✨ **Gợi Ý Khuyến Mãi:**\n\nChương trình **${p.Name}** đang diễn ra: ${val}${condition}.\n\n👉 ${btn}`,
                      MessageID: `ephemeral-combo-${p.PromotionID}`,
                      createdAt: new Date().toISOString()
                    };
                 });
              }
              setMessages([...systemMsgs, ...dbMessages]);
            })
            .catch(() => {
              setMessages(dbMessages);
            });
        }
      });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !activeSessionId) return;

    socket.emit('admin_message', { sessionId: activeSessionId, content: input });
    
    // Also update local sessions status if it was waiting
    setSessions(prev => prev.map(s => {
      if (s.SessionID === activeSessionId && s.Status === 'WAITING_FOR_ADMIN') {
        return { ...s, Status: 'ADMIN_HANDLING' };
      }
      return s;
    }));

    setInput('');
  };

  const handleCloseSession = () => {
    if (!socket || !activeSessionId) return;
    if (confirm('Bạn có chắc chắn muốn đóng phiên chat này?')) {
      socket.emit('close_session', { sessionId: activeSessionId });
      setActiveSessionId(null);
      toast.success('Đã đóng phiên chat');
    }
  };

  const activeSessionData = sessions.find(s => s.SessionID === activeSessionId);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background border rounded-xl overflow-hidden shadow-sm">
      {/* Sidebar: Session List */}
      <div className="w-80 border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-bold text-lg">Khách hàng cần hỗ trợ</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Không có cuộc hội thoại nào đang chờ.
            </div>
          )}
          {sessions.map((session) => (
            <div
              key={session.SessionID}
              onClick={() => handleSelectSession(session.SessionID)}
              className={cn(
                "p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 relative",
                activeSessionId === session.SessionID ? "bg-primary/5" : ""
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm">
                  Khách hàng {session.SessionID.slice(0, 6)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(session.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {session.Status === 'WAITING_FOR_ADMIN' ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase flex items-center gap-1">
                    <Clock size={10} /> Đang chờ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 size={10} /> Đang xử lý
                  </span>
                )}
              </div>
              {session.Messages?.[0] && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {session.Messages[0].SenderType === 'CUSTOMER' ? 'Khách: ' : 'Bạn: '}
                  {session.Messages[0].Content}
                </p>
              )}
              {/* Red dot indicator for waiting sessions */}
              {session.Status === 'WAITING_FOR_ADMIN' && activeSessionId !== session.SessionID && (
                <div className="absolute right-4 top-1/2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-muted/5">
        {!activeSessionId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>Chọn một cuộc hội thoại bên trái để bắt đầu nhắn tin</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-bold">Khách hàng {activeSessionId.slice(0, 6)}</h3>
                <p className="text-xs text-muted-foreground">
                  Trạng thái: {activeSessionData?.Status === 'WAITING_FOR_ADMIN' ? 'Đang chờ bạn trả lời' : 'Đang trò chuyện'}
                </p>
              </div>
              <button 
                onClick={handleCloseSession}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
              >
                Đóng Chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isAdmin = msg.SenderType === 'ADMIN';
                const isCustomer = msg.SenderType === 'CUSTOMER';
                
                return (
                  <div key={idx} className={cn("flex w-full", isAdmin ? "justify-end" : "justify-start")}>
                    <div className={cn("flex max-w-[70%] gap-3", isAdmin ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                        isAdmin ? "bg-primary/10 text-primary" : 
                        isCustomer ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {isAdmin ? <Headset size={18} /> : isCustomer ? <User size={18} /> : <Bot size={18} />}
                      </div>
                      
                      <div className={cn(
                        "p-4 rounded-2xl text-sm shadow-sm",
                        isAdmin ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-background border rounded-tl-sm"
                      )}>
                        <div className="space-y-1 [&>p]:m-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:m-0 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:m-0">
                          {(() => {
                            const content = msg.Content || '';
                            const buyNowRegex = /\[BUY_NOW:([A-Za-z0-9-]+):(\d+)\]/g;
                            const addComboRegex = /\[ADD_COMBO:([0-9,]+)\]/g;
                            
                            const parts = [];
                            let lastIndex = 0;
                            
                            let matchAddCombo;
                            while ((matchAddCombo = addComboRegex.exec(content)) !== null) {
                              if (matchAddCombo.index > lastIndex) {
                                parts.push(<ReactMarkdown key={`text-${lastIndex}`}>{content.slice(lastIndex, matchAddCombo.index)}</ReactMarkdown>);
                              }
                              const drinkSizeIdsStr = matchAddCombo[1];
                              
                              parts.push(
                                <div key={`combo-${matchAddCombo.index}`} className="mt-2 mb-2 p-3 bg-purple-100 border border-purple-200 rounded-lg shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">🎁</span>
                                    <span className="font-bold text-purple-800 text-sm">Gợi ý Combo</span>
                                  </div>
                                  <div className="text-xs text-purple-700 font-medium">
                                    Áp dụng cho các món: {drinkSizeIdsStr}
                                  </div>
                                </div>
                              );
                              lastIndex = addComboRegex.lastIndex;
                            }
                            
                            let textAfterCombo = content.slice(lastIndex);
                            lastIndex = 0;
                            const finalParts = [];
                            
                            let matchBuyNow;
                            while ((matchBuyNow = buyNowRegex.exec(textAfterCombo)) !== null) {
                              if (matchBuyNow.index > lastIndex) {
                                finalParts.push(<ReactMarkdown key={`text-buy-${lastIndex}`}>{textAfterCombo.slice(lastIndex, matchBuyNow.index)}</ReactMarkdown>);
                              }
                              const code = matchBuyNow[1];
                              const drinkId = matchBuyNow[2];
                              
                              finalParts.push(
                                <div key={`voucher-${matchBuyNow.index}`} className="mt-2 mb-2 p-3 bg-orange-100 border border-orange-200 rounded-lg shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">🎟️</span>
                                    <span className="font-bold text-orange-800 text-sm">Voucher đã phát</span>
                                  </div>
                                  <div className="text-xs text-orange-700 font-bold mb-1">
                                    Mã: {code}
                                  </div>
                                  <div className="text-[10px] text-orange-600">
                                    Áp dụng cho món ID: {drinkId}
                                  </div>
                                </div>
                              );
                              lastIndex = buyNowRegex.lastIndex;
                            }
                            
                            if (lastIndex < textAfterCombo.length) {
                              finalParts.push(<ReactMarkdown key={`text-buy-${lastIndex}`}>{textAfterCombo.slice(lastIndex)}</ReactMarkdown>);
                            }
                            
                            return parts.length === 0 && finalParts.length === 0 ? (
                              <ReactMarkdown>{content}</ReactMarkdown>
                            ) : (
                              <>{parts}{finalParts}</>
                            );
                          })()}
                        </div>
                        <div className={cn("text-[10px] mt-1 opacity-70", isAdmin ? "text-right" : "text-left")}>
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-background border-t relative">
              {showComboMenu && (
                <div className="absolute bottom-full left-4 mb-2 w-72 bg-background border rounded-xl shadow-lg overflow-hidden z-10">
                  <div className="p-3 bg-muted/50 border-b">
                    <h4 className="font-bold text-sm">Gợi ý Combo</h4>
                    <p className="text-xs text-muted-foreground mt-1">Chọn một combo để tự động điền vào ô chat</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {combos.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Không có combo nào khả dụng</div>
                    ) : (
                      combos.map((combo) => (
                        <div 
                          key={combo.PromotionID}
                          className="p-3 border-b hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => {
                            let targetIds: number[] = [];
                            try {
                              targetIds = JSON.parse(combo.TargetDrinkIDs || '[]');
                            } catch (e) {}
                            
                            const comboText = `[ADD_COMBO:${targetIds.join(',')}]`;
                            setInput(prev => prev ? `${prev} ${comboText}` : comboText);
                            setShowComboMenu(false);
                          }}
                        >
                          <div className="font-semibold text-sm text-primary">{combo.Name}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{combo.Description}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSend} className="flex gap-3 relative">
                <button
                  type="button"
                  onClick={() => setShowComboMenu(!showComboMenu)}
                  className="bg-orange-100 text-orange-600 px-4 rounded-xl hover:bg-orange-200 transition-colors flex items-center justify-center"
                  title="Gợi ý Combo"
                >
                  <Package size={20} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập câu trả lời của bạn..."
                  className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onClick={() => showComboMenu && setShowComboMenu(false)}
                />
                <button 
                  type="submit" 
                  disabled={!input.trim()}
                  className="bg-primary text-primary-foreground px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 font-semibold"
                >
                  <Send size={18} /> Gửi
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Ensure MessageCircle is imported
import { MessageCircle } from 'lucide-react';
