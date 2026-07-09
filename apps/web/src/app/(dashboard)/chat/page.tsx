'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bot, Headset, User, Send, CheckCircle2, Clock } from 'lucide-react';
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
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
    const newSocket = io('http://localhost:3001', { withCredentials: true });
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
    // Fetch full history for this session
    fetch(`http://localhost:3001/api/v1/chat/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setMessages(data.data.Messages);
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
                          <ReactMarkdown>
                            {msg.Content}
                          </ReactMarkdown>
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
            <div className="p-4 bg-background border-t">
              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập câu trả lời của bạn..."
                  className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
