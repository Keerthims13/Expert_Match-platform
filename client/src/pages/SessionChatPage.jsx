import { useEffect, useMemo, useState } from 'react';
import {
  fetchUnreadCounts,
  fetchSessionMessages,
  fetchSessions,
  markSessionRead,
  updateSessionStatus
} from '../services/sessionApi.js';
import { getChatSocket } from '../services/chatSocket.js';

const initialDraft = {
  senderRole: 'student',
  senderName: 'Student',
  message: ''
};

function SessionChatPage({ initialSessionId, currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId || null);
  const [messages, setMessages] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({
    ...initialDraft,
    senderRole: currentUser?.role || initialDraft.senderRole,
    senderName: currentUser?.fullName || initialDraft.senderName
  });
  const [typingBySession, setTypingBySession] = useState({});
  const [presenceBySession, setPresenceBySession] = useState({});
  const [unreadBySession, setUnreadBySession] = useState({});

  function isCurrentParticipant(senderRole, senderName) {
    return (
      String(senderRole || '').trim().toLowerCase() === String(draft.senderRole || '').trim().toLowerCase() &&
      String(senderName || '').trim() === String(draft.senderName || '').trim()
    );
  }

  async function loadUnreadCounts() {
    try {
      const data = await fetchUnreadCounts();
      setUnreadBySession(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    const socket = getChatSocket();

    function onNewMessage(message) {
      if (Number(message.sessionId) === Number(selectedSessionId)) {
        setMessages((prev) => {
          if (prev.some((item) => item.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        if (!isCurrentParticipant(message.senderRole, message.senderName)) {
          socket.emit('mark_read', {
            sessionId: selectedSessionId,
            senderRole: draft.senderRole,
            senderName: draft.senderName
          });
        }
      } else {
        if (isCurrentParticipant(message.senderRole, message.senderName)) {
          return;
        }

        setUnreadBySession((prev) => ({
          ...prev,
          [message.sessionId]: (prev[message.sessionId] || 0) + 1
        }));
      }
    }

    function onTyping(payload) {
      const sessionId = Number(payload?.sessionId);
      if (!sessionId) return;

      setTypingBySession((prev) => {
        if (!payload.isTyping) {
          const clone = { ...prev };
          delete clone[sessionId];
          return clone;
        }

        return {
          ...prev,
          [sessionId]: payload.senderName || 'Someone'
        };
      });
    }

    function onRoomPresence(payload) {
      const sessionId = Number(payload?.sessionId);
      if (!sessionId) return;

      setPresenceBySession((prev) => ({
        ...prev,
        [sessionId]: Number(payload.onlineCount) || 0
      }));
    }

    function onMessageStatusUpdated(payload) {
      const sessionId = Number(payload?.sessionId);
      if (!sessionId || sessionId !== Number(selectedSessionId)) return;

      const messageIds = Array.isArray(payload?.messageIds) ? payload.messageIds.map(Number) : [];
      if (!messageIds.length) return;

      setMessages((prev) =>
        prev.map((item) => {
          if (!messageIds.includes(Number(item.id))) return item;

          return {
            ...item,
            messageStatus: payload.status || item.messageStatus
          };
        })
      );
    }

    function onConnectError(connectionError) {
      setError(connectionError.message || 'Realtime connection failed');
    }

    socket.on('new_message', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('room_presence', onRoomPresence);
    socket.on('message_status_updated', onMessageStatusUpdated);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('room_presence', onRoomPresence);
      socket.off('message_status_updated', onMessageStatusUpdated);
      socket.off('connect_error', onConnectError);
    };
  }, [selectedSessionId, draft.senderName, draft.senderRole]);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const data = await fetchSessions();
      setSessions(data);

      if (!selectedSessionId && data.length) {
        setSelectedSessionId(initialSessionId || data[0].id);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadSessions();
    loadUnreadCounts();
  }, []);

  useEffect(() => {
    loadUnreadCounts();
  }, [currentUser?.id]);

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      senderRole: currentUser?.role || prev.senderRole,
      senderName: currentUser?.fullName || prev.senderName
    }));
  }, [currentUser]);

  useEffect(() => {
    if (!initialSessionId) return;
    setSelectedSessionId(initialSessionId);
  }, [initialSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoadingMessages(true);

    fetchSessionMessages(selectedSessionId)
      .then((data) => {
        if (active) {
          setMessages(data);
          markSessionRead(selectedSessionId)
            .then(() => {
              setUnreadBySession((prev) => ({ ...prev, [selectedSessionId]: 0 }));
            })
            .catch(() => {});
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const socket = getChatSocket();
    socket.emit('join_session', {
      sessionId: selectedSessionId,
      senderName: draft.senderName,
      senderRole: draft.senderRole
    });
    setUnreadBySession((prev) => ({ ...prev, [selectedSessionId]: 0 }));

    return () => {
      socket.emit('leave_session', { sessionId: selectedSessionId });
    };
  }, [selectedSessionId, draft.senderName, draft.senderRole]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  async function onSend(event) {
    event.preventDefault();
    if (!selectedSessionId) return;

    try {
      const socket = getChatSocket();

      await new Promise((resolve, reject) => {
        socket.emit(
          'send_message',
          {
            sessionId: selectedSessionId,
            senderRole: draft.senderRole,
            senderName: draft.senderName,
            message: draft.message
          },
          (response) => {
            if (response?.ok) {
              resolve(response.data);
            } else {
              reject(new Error(response?.message || 'Failed to send message'));
            }
          }
        );
      });

      setDraft((prev) => ({ ...prev, message: '' }));
      socket.emit('typing', {
        sessionId: selectedSessionId,
        isTyping: false,
        senderName: draft.senderName
      });
      setError('');
    } catch (sendError) {
      setError(sendError.message);
    }
  }

  async function onStatusChange(status) {
    if (!selectedSessionId) return;

    try {
      const updated = await updateSessionStatus(selectedSessionId, status);
      setSessions((prev) => prev.map((session) => (session.id === updated.id ? updated : session)));
      setError('');
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  return (
    <section className="page-card session-layout">
      <div>
        <p className="label">Sessions</p>
        <h1>Active consultations</h1>
        {loadingSessions ? <p className="muted">Loading sessions...</p> : null}
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`session-item ${selectedSessionId === session.id ? 'active' : ''}`}
              onClick={() => setSelectedSessionId(session.id)}
            >
              <strong>
                #{session.id} {session.doubt.title}
                {unreadBySession[session.id] ? (
                  <span className="unread-pill">{unreadBySession[session.id]}</span>
                ) : null}
              </strong>
              <span className="muted">{session.expert.fullName}</span>
              <div className="session-meta-line">
                <span className="mini-id">{session.status}</span>
                <span className="mini-id">{presenceBySession[session.id] || 0} online</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Session Chat</p>
        {!selectedSession ? (
          <p className="muted">Select a session from the left panel.</p>
        ) : (
          <>
            <div className="session-headline">
              <div>
                <h2>{selectedSession.doubt.title}</h2>
                <p className="muted">with {selectedSession.expert.fullName}</p>
                <p className="typing-line">
                  {typingBySession[selectedSession.id]
                    ? `${typingBySession[selectedSession.id]} is typing...`
                    : `${presenceBySession[selectedSession.id] || 0} participants online`}
                </p>
              </div>
              <div className="session-actions">
                <button type="button" className="secondary-btn" onClick={() => onStatusChange('active')}>
                  Mark Active
                </button>
                <button type="button" className="secondary-btn" onClick={() => onStatusChange('completed')}>
                  End Session
                </button>
              </div>
            </div>

            {loadingMessages ? <p className="muted">Loading messages...</p> : null}
            <div className="chat-box">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-bubble ${msg.senderRole}`}>
                  <strong>{msg.senderName}</strong>
                  <p>{msg.message}</p>
                  <span>
                    {msg.createdAtLabel}
                    {isCurrentParticipant(msg.senderRole, msg.senderName)
                      ? ` • ${String(msg.messageStatus || 'sent').toUpperCase()}`
                      : ''}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={onSend} className="chat-form">
              <p className="muted">You are sending as: {draft.senderName} ({draft.senderRole})</p>
              <textarea
                rows="3"
                value={draft.message}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((prev) => ({ ...prev, message: value }));

                  if (!selectedSessionId) return;

                  const socket = getChatSocket();
                  socket.emit('typing', {
                    sessionId: selectedSessionId,
                    isTyping: value.trim().length > 0,
                    senderName: draft.senderName
                  });
                }}
                placeholder="Type your message"
                required
              />
              <button type="submit" className="primary-btn">Send Message</button>
            </form>
          </>
        )}

        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </section>
  );
}

export default SessionChatPage;
