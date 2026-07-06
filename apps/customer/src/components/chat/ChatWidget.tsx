'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, X, Send, User, Bot, Headset } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';

// Generate or get a simple session ID (Must be valid UUID for SQL Server)
const getSessionId = () => {
  let sid = localStorage.getItem('chat_session_id');
  // Simple check for valid UUID length (36 chars)
  if (!sid || sid.length !== 36 || !sid.includes('-')) {
    sid = crypto.randomUUID();
    localStorage.setItem('chat_session_id', sid);
  }
  return sid;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionStatus, setSessionStatus] = useState('AI_HANDLING');
  const [authRefresh, setAuthRefresh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Lắng nghe sự kiện đăng nhập/đăng xuất để làm mới khung chat
  useEffect(() => {
    const handleAuthChange = () => {
      setMessages([]);
      setSessionStatus('AI_HANDLING');
      setAuthRefresh(prev => prev + 1);
    };
    window.addEventListener('customer_auth_changed', handleAuthChange);
    return () => window.removeEventListener('customer_auth_changed', handleAuthChange);
  }, []);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001', {
      withCredentials: true,
    });
    setSocket(newSocket);

    const sessionId = getSessionId();
    const customer = api.getCurrentCustomer();
    const customerId = customer ? customer.CustomerID : undefined;

    newSocket.on('connect', () => {
      newSocket.emit('join_session', { sessionId, customerId });
    });

    newSocket.on('session_joined', async (session) => {
      setSessionStatus(session.Status);
      let loadedMessages = session.Messages || [];
      
      try {
        const lastComboSession = localStorage.getItem('last_combo_shown_session');
        
        if (lastComboSession !== sessionId) {
          const combos = await api.getChatboxCombos();
          if (combos && combos.length > 0) {
            const comboMsgs = combos.map((p: any) => {
              let btn = '[XEM MENU](/menu)'; // This will be parsed by UI if needed, or just text
              if (p.TargetDrinkIDs) {
                try {
                  const arr = JSON.parse(p.TargetDrinkIDs);
                  if (arr.length > 0) {
                    btn = `[ADD_COMBO:${arr.join(',')}]`;
                  }
                } catch(e){}
              }
              const condition = p.MinQuantity > 0 ? ` (Mua từ ${p.MinQuantity} ly)` : '';
              const val = p.Type === 'PERCENT' ? `giảm ${p.Value}%` : p.Type === 'AMOUNT' ? `giảm ${p.Value.toLocaleString()}đ` : `tặng ${p.Value} ly`;
              
              return {
                SenderType: 'AI',
                Content: `✨ **Gợi Ý Khuyến Mãi:**\n\nChương trình **${p.Name}** đang diễn ra: ${val}${condition}.\n\n👉 ${btn}`,
                MessageID: `ephemeral-combo-${p.PromotionID}`,
                createdAt: new Date().toISOString()
              };
            });
            loadedMessages = [...loadedMessages, ...comboMsgs];
            localStorage.setItem('last_combo_shown_session', sessionId);
          }
        }
      } catch (err) {
        console.error('Lỗi lấy combo chatbox:', err);
      }
      
      setMessages(loadedMessages);
    });

    newSocket.on('ai_reply', (msg) => {
      setMessages((prev) => {
        if (msg.MessageID && prev.some(m => m.MessageID === msg.MessageID)) return prev;
        return [...prev, msg];
      });
    });

    newSocket.on('admin_reply', (msg) => {
      setMessages((prev) => {
        if (msg.MessageID && prev.some(m => m.MessageID === msg.MessageID)) return prev;
        return [...prev, msg];
      });
    });

    newSocket.on('session_status_changed', ({ status }) => {
      setSessionStatus(status);
      if (status === 'CLOSED') {
        setMessages((prev) => [...prev, { SenderType: 'SYSTEM', Content: 'Phiên hỗ trợ đã kết thúc.' }]);
      }
    });

    return () => {
      newSocket.close();
    };
  }, [authRefresh]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || sessionStatus === 'CLOSED') return;

    const newMsg = {
      SenderType: 'CUSTOMER',
      Content: input,
      createdAt: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, newMsg]);
    socket.emit('customer_message', { sessionId: getSessionId(), content: input });
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-background border rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-full">
                {sessionStatus === 'ADMIN_HANDLING' ? <Headset size={20} /> : <Bot size={20} />}
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {sessionStatus === 'ADMIN_HANDLING' ? 'Nhân viên Hỗ trợ' : 'Phêla AI Assistant'}
                </h3>
                <p className="text-xs text-primary-foreground/80">
                  {sessionStatus === 'WAITING_FOR_ADMIN' 
                    ? 'Đang kết nối nhân viên...' 
                    : sessionStatus === 'CLOSED'
                    ? 'Đã đóng'
                    : 'Sẵn sàng giải đáp'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-primary-foreground/20 p-1 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm my-10">
                Xin chào! Phêla có thể giúp gì cho bạn?
              </div>
            )}
            
            {messages.map((msg, idx) => {
              const isCustomer = msg.SenderType === 'CUSTOMER';
              const isSystem = msg.SenderType === 'SYSTEM';

              if (isSystem) {
                return (
                  <div key={idx} className="flex justify-center">
                    <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                      {msg.Content}
                    </span>
                  </div>
                );
              }

              return (
                <div key={idx} className={cn("flex w-full", isCustomer ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[80%] gap-2", isCustomer ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1",
                      isCustomer ? "bg-primary/10 text-primary" : 
                      msg.SenderType === 'ADMIN' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {isCustomer ? <User size={14} /> : msg.SenderType === 'ADMIN' ? <Headset size={14} /> : <Bot size={14} />}
                    </div>
                    
                    <div className={cn(
                      "p-3 rounded-2xl text-sm",
                      isCustomer ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-background border shadow-sm rounded-tl-sm"
                    )}>
                      <div className="space-y-1 [&>p]:m-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:m-0 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:m-0">
                        {(() => {
                          const content = msg.Content || '';
                          const buyNowRegex = /\[BUY_NOW:([A-Za-z0-9-]+):(\d+)\]/g;
                          const addComboRegex = /\[ADD_COMBO:([0-9,]+)\]/g;
                          
                          const parts = [];
                          let lastIndex = 0;
                          
                          // First, replace ADD_COMBO
                          let matchAddCombo;
                          while ((matchAddCombo = addComboRegex.exec(content)) !== null) {
                            if (matchAddCombo.index > lastIndex) {
                              parts.push(<ReactMarkdown key={`text-${lastIndex}`}>{content.slice(lastIndex, matchAddCombo.index)}</ReactMarkdown>);
                            }
                            const drinkSizeIdsStr = matchAddCombo[1];
                            
                            parts.push(
                              <div key={`combo-${matchAddCombo.index}`} className="mt-2 mb-1">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-[220px]">
                                  <p className="text-emerald-800 text-xs font-bold mb-2 leading-tight">Thêm Combo Này Vào Giỏ Hàng?</p>
                                  <button 
                                     onClick={() => {
                                       window.dispatchEvent(new CustomEvent('ai_add_combo', { detail: { drinkSizeIds: drinkSizeIdsStr.split(',').map(Number) } }));
                                     }}
                                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow-sm"
                                  >
                                     Thêm Vào Giỏ
                                  </button>
                                </div>
                              </div>
                            );
                            lastIndex = matchAddCombo.index + matchAddCombo[0].length;
                          }

                          // Then, replace BUY_NOW (for vouchers)
                          let matchBuyNow;
                          while ((matchBuyNow = buyNowRegex.exec(content)) !== null) {
                            if (matchBuyNow.index > lastIndex) {
                              parts.push(<ReactMarkdown key={`text2-${lastIndex}`}>{content.slice(lastIndex, matchBuyNow.index)}</ReactMarkdown>);
                            }
                            const code = matchBuyNow[1];
                            const drinkSizeId = matchBuyNow[2];
                            
                            parts.push(
                              <div key={`buynow-${matchBuyNow.index}`} className="mt-2 mb-1">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-[220px]">
                                  <p className="text-emerald-800 text-xs font-bold mb-2 leading-tight">Mã ưu đãi 10%: <span className="bg-emerald-200/60 px-1 py-0.5 rounded font-mono block mt-1">{code}</span></p>
                                  <button 
                                     onClick={() => {
                                       window.dispatchEvent(new CustomEvent('ai_buy_now', { detail: { code, drinkSizeId: Number(drinkSizeId) } }));
                                     }}
                                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow-sm"
                                  >
                                     Áp dụng mã
                                  </button>
                                </div>
                              </div>
                            );
                            lastIndex = matchBuyNow.index + matchBuyNow[0].length;
                          }

                          if (lastIndex < content.length) {
                            parts.push(<ReactMarkdown key={`text3-${lastIndex}`}>{content.slice(lastIndex)}</ReactMarkdown>);
                          }
                          
                          return parts.length > 0 ? parts : <ReactMarkdown>{content}</ReactMarkdown>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-background border-t">
            {sessionStatus === 'CLOSED' ? (
              <button
                onClick={() => {
                  localStorage.removeItem('chat_session_id');
                  setMessages([]);
                  setSessionStatus('AI_HANDLING');
                  const newSid = getSessionId();
                  const customer = api.getCurrentCustomer();
                  const customerId = customer ? customer.CustomerID : undefined;
                  socket?.emit('join_session', { sessionId: newSid, customerId });
                }}
                className="w-full bg-primary text-primary-foreground py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Bắt đầu cuộc trò chuyện mới
              </button>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim()}
                  className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
