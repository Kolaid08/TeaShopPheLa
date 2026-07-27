import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createSession, getSessionById, addMessage, updateSessionStatus, updateSessionCustomer } from './chat.service';
import { generateAIResponse } from './ai.service';
import { config } from '../../config';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../../middleware/auth';

let io: Server;

export const initSocketIo = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: [config.clientUrl, config.customerClientUrl],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`New socket connection: ${socket.id}`);

    // Customer joins their own session room
    socket.on('join_session', async ({ sessionId, customerId, token }: { sessionId: string, customerId?: number, token?: string }) => {
      if (customerId) {
        if (!token) return; // Unauthorized
        try {
          const decoded = jwt.verify(token, config.jwt.accessSecret) as UserPayload;
          if (decoded.CustomerID !== customerId) return; // Forbid joining someone else's chat
        } catch { return; }
      }

      let session = await getSessionById(sessionId);
      
      if (!session) {
        await createSession(sessionId, customerId);
        session = await getSessionById(sessionId);
      } else if (customerId && session.CustomerID !== customerId) {
        // Link anonymous session to logged-in customer
        await updateSessionCustomer(sessionId, customerId);
        session = await getSessionById(sessionId);
      } else if (session.CustomerID && session.CustomerID !== customerId) {
        // Prevent anonymous users from joining a logged-in user's session
        return;
      }
      
      if (!session) return;
      socket.join(session.SessionID);
      // LƯU Ý BẢO MẬT (IDOR Fix): Gắn cứng sessionId vào socket để chống giả mạo
      socket.data.sessionId = session.SessionID; 
      socket.emit('session_joined', session);
    });

    // Customer sends a message
    socket.on('customer_message', async ({ sessionId, content }: { sessionId: string, content: string }) => {
      // BẢO MẬT (IDOR Fix): Chỉ cho phép gửi tin nhắn nếu socket thực sự đã join vào đúng sessionId này
      if (socket.data.sessionId !== sessionId) {
        console.warn(`[Cảnh báo Bảo mật] Socket ${socket.id} cố tình giả mạo gửi tin nhắn vào session ${sessionId}`);
        return;
      }

      // 1. Save customer message
      const customerMsg = await addMessage(sessionId, 'CUSTOMER', content);
      
      // 2. Broadcast to admins if they are listening to this session
      io.to('admins').emit('new_message_in_session', { sessionId, message: customerMsg });

      // 3. Get session status to see if AI should handle
      const session = await getSessionById(sessionId);
      if (!session) return;

      if (session.Status === 'AI_HANDLING') {
        try {
          // Format history for Gemini as a simple array of objects (limit to last 20 messages for context)
          const history = session.Messages.slice(-21).map(m => ({
            sender: m.SenderType,
            text: m.Content
          }));

          // Remove the latest customer message from history since it's passed as newMessage
          history.pop(); 

          let aiText = await generateAIResponse(history, content, session.CustomerID);
          
          let isHandoff = false;
          if (aiText.includes('[HANDOFF_TO_HUMAN]')) {
            isHandoff = true;
            aiText = aiText.replace('[HANDOFF_TO_HUMAN]', '').trim();
            if (!aiText) aiText = "Dạ hệ thống đang chuyển kết nối đến nhân viên chăm sóc khách hàng, anh/chị vui lòng đợi trong giây lát nhé.";
          }

          // Save AI message
          const aiMsg = await addMessage(sessionId, 'AI', aiText);
          
          // Send AI reply back to customer room
          io.to(sessionId).emit('ai_reply', aiMsg);
          // Broadcast to admin room too
          io.to('admins').emit('new_message_in_session', { sessionId, message: aiMsg });

          if (isHandoff) {
            await updateSessionStatus(sessionId, 'WAITING_FOR_ADMIN');
            io.to(sessionId).emit('session_status_changed', { status: 'WAITING_FOR_ADMIN' });
            // Notify all admins globally
            io.to('admins').emit('admin_needed_notification', { sessionId, message: 'Có khách hàng đang cần hỗ trợ!' });
          }

        } catch (error) {
          console.error('AI Error:', error);
          const errorMsg = await addMessage(sessionId, 'AI', 'Xin lỗi anh/chị, hệ thống đang bận. Đã chuyển yêu cầu đến nhân viên trực.');
          io.to(sessionId).emit('ai_reply', errorMsg);
          
          await updateSessionStatus(sessionId, 'WAITING_FOR_ADMIN');
          io.to(sessionId).emit('session_status_changed', { status: 'WAITING_FOR_ADMIN' });
          io.to('admins').emit('admin_needed_notification', { sessionId, message: 'Có khách hàng đang cần hỗ trợ (AI Error)!' });
        }
      }
    });

    // Admin joins global admins room
    socket.on('admin_join', (payload?: { token?: string }) => {
      const token = payload?.token;
      if (!token) return;
      try {
        if (token.startsWith('mock_token_') && process.env.NODE_ENV === 'development') {
          socket.data.user = { RoleName: 'ADMIN' } as UserPayload;
          socket.join('admins');
          socket.join('admin_orders');
          console.log(`Socket ${socket.id} joined admins room (mock)`);
          return;
        }
        
        const decoded = jwt.verify(token, config.jwt.accessSecret) as UserPayload;
        if (decoded.RoleName) {
          socket.data.user = decoded;
          socket.join('admins');
          socket.join('admin_orders');
          console.log(`Socket ${socket.id} joined admins room`);
        }
      } catch (err) {
        console.error(`Invalid token for admin_join from socket ${socket.id}`);
      }
    });

    // Customer joins their own private room for real-time order updates
    socket.on('customer_join', (payload?: { token?: string }) => {
      const token = payload?.token;
      if (!token) return;
      try {
        if (token.startsWith('real_cust_token_') && process.env.NODE_ENV === 'development') {
          // Dev mock fallback - skip verification
          return;
        }
        const decoded = jwt.verify(token, config.jwt.accessSecret) as UserPayload;
        if (decoded.CustomerID) {
          socket.join(`customer_${decoded.CustomerID}`);
          socket.join('customers_global');
          console.log(`Socket ${socket.id} joined customer_${decoded.CustomerID} and customers_global`);
        }
      } catch (err) {
        console.error(`Invalid token for customer_join from socket ${socket.id}`);
      }
    });

    // Admin sends a message to customer
    socket.on('admin_message', async (payload?: { sessionId: string, content: string }) => {
      if (!payload || !payload.sessionId || !payload.content) return;
      const { sessionId, content } = payload;
      // Authenticate socket for admin
      if (!socket.data.user || (socket.data.user.RoleName !== 'ADMIN' && socket.data.user.RoleName !== 'MANAGER')) {
        return; // Unauthorized
      }

      // If admin replies, automatically change status to ADMIN_HANDLING
      const session = await getSessionById(sessionId);
      if (session && session.Status !== 'ADMIN_HANDLING') {
        await updateSessionStatus(sessionId, 'ADMIN_HANDLING');
        io.to(sessionId).emit('session_status_changed', { status: 'ADMIN_HANDLING' });
        // Refresh admin dashboard list
        io.to('admins').emit('refresh_sessions');
      }

      const adminMsg = await addMessage(sessionId, 'ADMIN', content);
      
      // Send to customer room and admin room
      io.to(sessionId).emit('admin_reply', adminMsg);
      io.to('admins').emit('new_message_in_session', { sessionId, message: adminMsg });
    });

    // Admin closes session
    socket.on('close_session', async (payload?: { sessionId: string }) => {
      if (!payload || !payload.sessionId) return;
      const { sessionId } = payload;
      // Authenticate socket for admin
      if (!socket.data.user || (socket.data.user.RoleName !== 'ADMIN' && socket.data.user.RoleName !== 'MANAGER')) {
        return; // Unauthorized
      }
      await updateSessionStatus(sessionId, 'CLOSED');
      io.to(sessionId).emit('session_status_changed', { status: 'CLOSED' });
      io.to('admins').emit('refresh_sessions');
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
