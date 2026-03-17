import { Server } from 'socket.io';
import { sessionService } from '../services/sessionService.js';

function toRoom(sessionId) {
  return `session:${sessionId}`;
}

function toPositiveInt(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function emitPresence(io, sessionId) {
  const room = toRoom(sessionId);
  const roomSockets = io.sockets.adapter.rooms.get(room);
  const onlineCount = roomSockets ? roomSockets.size : 0;

  io.to(room).emit('room_presence', {
    sessionId,
    onlineCount
  });
}

export function initChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_session', ({ sessionId, senderName }, ack) => {
      const numericSessionId = toPositiveInt(sessionId);

      if (!numericSessionId) {
        if (ack) ack({ ok: false, message: 'sessionId must be a positive integer' });
        return;
      }

      if (socket.data.joinedSessionId && socket.data.joinedSessionId !== numericSessionId) {
        socket.leave(toRoom(socket.data.joinedSessionId));
        emitPresence(io, socket.data.joinedSessionId);
      }

      socket.join(toRoom(numericSessionId));
      socket.data.joinedSessionId = numericSessionId;
      socket.data.senderName = String(senderName || 'Anonymous').trim() || 'Anonymous';

      emitPresence(io, numericSessionId);
      if (ack) ack({ ok: true });
    });

    socket.on('leave_session', ({ sessionId }, ack) => {
      const numericSessionId = toPositiveInt(sessionId);
      if (!numericSessionId) {
        if (ack) ack({ ok: false, message: 'sessionId must be a positive integer' });
        return;
      }

      socket.leave(toRoom(numericSessionId));
      if (socket.data.joinedSessionId === numericSessionId) {
        socket.data.joinedSessionId = null;
      }
      emitPresence(io, numericSessionId);
      if (ack) ack({ ok: true });
    });

    socket.on('typing', ({ sessionId, isTyping, senderName }) => {
      const numericSessionId = toPositiveInt(sessionId);
      if (!numericSessionId) return;

      socket.to(toRoom(numericSessionId)).emit('typing', {
        sessionId: numericSessionId,
        isTyping: Boolean(isTyping),
        senderName: String(senderName || socket.data.senderName || 'User').trim() || 'User'
      });
    });

    socket.on('send_message', async (payload, ack) => {
      try {
        const numericSessionId = toPositiveInt(payload?.sessionId);
        if (!numericSessionId) {
          throw new Error('sessionId must be a positive integer');
        }

        const message = await sessionService.createMessage(numericSessionId, payload);
        io.to(toRoom(numericSessionId)).emit('new_message', message);

        if (ack) ack({ ok: true, data: message });
      } catch (error) {
        if (ack) {
          ack({ ok: false, message: error.message || 'Failed to send message' });
        }
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.joinedSessionId) {
        emitPresence(io, socket.data.joinedSessionId);
      }
    });
  });

  return io;
}
