import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createSession, getSessionById, addMessage, updateSessionStatus, updateSessionCustomer } from './chat.service';
import { generateAIResponse } from './ai.service';
import { config } from '../../config';

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
    socket.on('join_session', async ({ sessionId, customerId }: { sessionId: string, customerId?: number }) => {
      let session = await getSessionById(sessionId);
      
      if (!session) {
        await createSession(sessionId, customerId);
        session = await getSessionById(sessionId);
      } else if (customerId && session.CustomerID !== customerId) {
        await updateSessionCustomer(sessionId, customerId);
        session = await getSessionById(sessionId);
      }
      
      if (!session) return;
      socket.join(session.SessionID);
      socket.emit('session_joined', session);
    });

    // Customer sends a message
    socket.on('customer_message', async ({ sessionId, content }: { sessionId: string, content: string }) => {
      // 1. Save customer message
      const customerMsg = await addMessage(sessionId, 'CUSTOMER', content);
      
      // 2. Broadcast to admins if they are listening to this session
      io.to('admins').emit('new_message_in_session', { sessionId, message: customerMsg });

      // 3. Get session status to see if AI should handle
      const session = await getSessionById(sessionId);
      if (!session) return;

      if (session.Status === 'AI_HANDLING') {
        try {
          // Format history for Gemini as a simple array of objects
          const history = session.Messages.map(m => ({
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
    socket.on('admin_join', () => {
      socket.join('admins');
      console.log(`Socket ${socket.id} joined admins room`);
    });

    // Admin sends a message to customer
    socket.on('admin_message', async ({ sessionId, content }: { sessionId: string, content: string }) => {
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
    socket.on('close_session', async ({ sessionId }: { sessionId: string }) => {
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
