import { Server } from 'socket.io';
import { sessionService } from '../services/sessionService.js';

function toRoom(sessionId) {
  return `session:${sessionId}`;
}

function toPositiveInt(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function toIdentityKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
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

function getRoomParticipantSummary(io, sessionId) {
  const room = toRoom(sessionId);
  const roomSockets = io.sockets.adapter.rooms.get(room);
  if (!roomSockets) {
    return { onlineCount: 0, hasStudent: false, hasExpert: false };
  }

  let hasStudent = false;
  let hasExpert = false;
  for (const socketId of roomSockets) {
    const peer = io.sockets.sockets.get(socketId);
    const role = String(peer?.data?.senderRole || '').trim().toLowerCase();
    if (role === 'student') hasStudent = true;
    if (role === 'expert') hasExpert = true;
  }

  return {
    onlineCount: roomSockets.size,
    hasStudent,
    hasExpert
  };
}

export function initChatSocket(httpServer) {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    socket.on('register_user', ({ userId, fullName, role }, ack) => {
      const numericUserId = toPositiveInt(userId);
      if (!numericUserId) {
        if (ack) ack({ ok: false, message: 'userId must be a positive integer' });
        return;
      }

      socket.join(`user:${numericUserId}`);
      const roleKey = String(role || '').trim().toLowerCase();
      const nameKey = toIdentityKey(fullName);
      if (roleKey && nameKey) {
        socket.join(`identity:${roleKey}:${nameKey}`);
      }
      socket.data.userId = numericUserId;
      if (ack) ack({ ok: true });
    });

    socket.on('join_session', async ({ sessionId, senderName, senderRole }, ack) => {
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
      socket.data.senderRole = String(senderRole || 'student').trim().toLowerCase() || 'student';

      try {
        const readResult = await sessionService.markSessionRead(numericSessionId, {
          senderRole: socket.data.senderRole,
          senderName: socket.data.senderName
        });

        if (readResult.seenMessageIds?.length) {
          io.to(toRoom(numericSessionId)).emit('message_status_updated', {
            sessionId: numericSessionId,
            messageIds: readResult.seenMessageIds,
            status: 'seen'
          });
        }

        const summary = getRoomParticipantSummary(io, numericSessionId);
        if (summary.hasStudent && summary.hasExpert) {
          const updatedSession = await sessionService.scheduleSessionStart(numericSessionId);
          io.to(toRoom(numericSessionId)).emit('session_status_updated', {
            sessionId: numericSessionId,
            session: updatedSession,
            actor: null
          });

          const forcedSeen = await sessionService.markAllPendingMessagesSeen(numericSessionId);
          if (forcedSeen.seenMessageIds?.length) {
            io.to(toRoom(numericSessionId)).emit('message_status_updated', {
              sessionId: numericSessionId,
              messageIds: forcedSeen.seenMessageIds,
              status: 'seen'
            });
          }
        }
      } catch (_error) {
        // Keep socket join resilient even if read marker fails.
      }

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

        const currentSession = await sessionService.getSessionById(numericSessionId);
        const room = toRoom(numericSessionId);
        const summary = getRoomParticipantSummary(io, numericSessionId);

        if (
          String(currentSession.status || '').toLowerCase() === 'accepted_pending'
          && summary.hasStudent
          && summary.hasExpert
        ) {
          const activatedSession = await sessionService.scheduleSessionStart(numericSessionId);
          io.to(room).emit('session_status_updated', {
            sessionId: numericSessionId,
            session: activatedSession,
            actor: null
          });
        }

        const message = await sessionService.createMessage(numericSessionId, payload);
        io.to(room).emit('new_message', message);

        const roomSockets = io.sockets.adapter.rooms.get(room);
        const onlineCount = roomSockets ? roomSockets.size : 0;
        if (onlineCount > 1) {
          const delivered = await sessionService.markMessageDelivered(message.id);
          if (delivered) {
            io.to(room).emit('message_status_updated', {
              sessionId: numericSessionId,
              messageIds: [delivered.id],
              status: 'delivered'
            });
          }
        }

        if (ack) ack({ ok: true, data: message });
      } catch (error) {
        if (ack) {
          ack({ ok: false, message: error.message || 'Failed to send message' });
        }
      }
    });

    socket.on('mark_read', async ({ sessionId, senderRole, senderName }, ack) => {
      try {
        const numericSessionId = toPositiveInt(sessionId);
        if (!numericSessionId) {
          throw new Error('sessionId must be a positive integer');
        }

        const readResult = await sessionService.markSessionRead(numericSessionId, {
          senderRole,
          senderName
        });

        if (readResult.seenMessageIds?.length) {
          io.to(toRoom(numericSessionId)).emit('message_status_updated', {
            sessionId: numericSessionId,
            messageIds: readResult.seenMessageIds,
            status: 'seen'
          });
        }

        if (ack) ack({ ok: true, data: readResult });
      } catch (error) {
        if (ack) ack({ ok: false, message: error.message || 'Failed to mark read' });
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
