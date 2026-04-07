import { useEffect, useMemo, useState } from 'react';
import {
  fetchSessionRating,
  fetchSessionBilling,
  fetchUnreadCounts,
  fetchSessionMessages,
  fetchSessions,
  markSessionRead,
  respondToSessionRequest,
  submitSessionRating,
  updateSessionStatus,
  checkAndActivateSession
} from '../services/sessionApi.js';
import { getChatSocket } from '../services/chatSocket.js';

const initialDraft = {
  senderRole: 'student',
  senderName: 'Student',
  message: ''
};

function SessionChatPage({ initialSessionId, currentUser, onSelectSession }) {
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [sessionRating, setSessionRating] = useState(null);
  const [ratingForm, setRatingForm] = useState({ rating: 5, reviewText: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [sessionBilling, setSessionBilling] = useState(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );
  const chatIsActive = useMemo(() => {
    if (String(selectedSession?.status || '').toLowerCase() !== 'active') return false;
    if (!selectedSession?.startedAt) return false;
    const startAtMs = new Date(selectedSession.startedAt).getTime();
    if (!Number.isFinite(startAtMs)) return false;
    return Date.now() >= startAtMs;
  }, [selectedSession?.status, selectedSession?.startedAt]);

  function isCurrentParticipant(senderRole, senderName) {
    return (
      String(senderRole || '').trim().toLowerCase() === String(draft.senderRole || '').trim().toLowerCase() &&
      String(senderName || '').trim() === String(draft.senderName || '').trim()
    );
  }

  function formatSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

    function onSessionLifecycle(payload) {
      const incoming = payload?.session;
      if (!incoming?.id) return;
      
      // Immediately update local state with new session data
      setSessions((prev) => {
        const index = prev.findIndex((item) => Number(item.id) === Number(incoming.id));
        if (index === -1) {
          return [incoming, ...prev];
        }
        const clone = [...prev];
        clone[index] = incoming;
        return clone;
      });
      
      // If this is the selected session and status changed to active, ensure it's in view
      if (Number(incoming.id) === Number(selectedSessionId)) {
        // Force a visual update by triggering message load
        if (String(incoming.status).toLowerCase() === 'active') {
          fetchSessionMessages(selectedSessionId)
            .then((messages) => {
              setMessages(messages);
            })
            .catch(() => {});
        }
      }
      
      // Refresh from server to ensure we have latest data
      loadSessions(false);
    }

    socket.on('new_message', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('room_presence', onRoomPresence);
    socket.on('message_status_updated', onMessageStatusUpdated);
    socket.on('session_request_created', onSessionLifecycle);
    socket.on('session_request_responded', onSessionLifecycle);
    socket.on('session_status_updated', onSessionLifecycle);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('room_presence', onRoomPresence);
      socket.off('message_status_updated', onMessageStatusUpdated);
      socket.off('session_request_created', onSessionLifecycle);
      socket.off('session_request_responded', onSessionLifecycle);
      socket.off('session_status_updated', onSessionLifecycle);
      socket.off('connect_error', onConnectError);
    };
  }, [selectedSessionId, draft.senderName, draft.senderRole]);

  async function loadSessions(showLoading = true) {
    if (showLoading) setLoadingSessions(true);
    try {
      const data = await fetchSessions();
      setSessions(data);

      if (!selectedSessionId && data.length) {
        setSelectedSessionId(initialSessionId || data[0].id);
      } else if (selectedSessionId && !data.some((item) => Number(item.id) === Number(selectedSessionId))) {
        // If selected session no longer exists, pick a pending/active one or the first one
        setSelectedSessionId(data.length ? data[0].id : null);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (showLoading) setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadSessions();
    loadUnreadCounts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions(false);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadUnreadCounts();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const socket = getChatSocket();
    socket.emit('register_user', {
      userId: currentUser.id,
      fullName: currentUser.fullName,
      role: currentUser.role
    });
  }, [currentUser?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions(false);
      loadUnreadCounts();
    }, 3000);

    function onFocus() {
      loadSessions(false);
      loadUnreadCounts();
    }

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [selectedSessionId]);

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

    // Aggressive polling while a session is selected to catch status changes
    const aggressiveInterval = setInterval(async () => {
      if (!active || !selectedSessionId) return;
      
      try {
        // Check if session needs to be activated (if both users are online)
        if (selectedSession && String(selectedSession.status || '').toLowerCase() === 'accepted_pending') {
          await checkAndActivateSession(selectedSessionId);
        }
      } catch (err) {
        // Silently fail - will retry on next interval
      }
      
      loadSessions(false);
    }, 500); // Check every 500ms while session is selected

    return () => {
      active = false;
      clearInterval(aggressiveInterval);
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
    }, (ack) => {
      // Server confirmed join succeeded - immediately refresh sessions
      setTimeout(() => {
        loadSessions(false);
      }, 100);
    });
    
    // Also immediately refresh after a very short delay to catch status changes
    const refreshTimer = setTimeout(() => {
      loadSessions(false);
    }, 300);
    
    setUnreadBySession((prev) => ({ ...prev, [selectedSessionId]: 0 }));

    return () => {
      clearTimeout(refreshTimer);
      socket.emit('leave_session', { sessionId: selectedSessionId });
    };
  }, [selectedSessionId, draft.senderName, draft.senderRole]);

  useEffect(() => {
    if (!selectedSessionId || currentUser?.role !== 'student') {
      setSessionRating(null);
      return;
    }

    if (String(selectedSession?.status || '').toLowerCase() !== 'completed') {
      setSessionRating(null);
      return;
    }

    let active = true;
    setRatingLoading(true);

    fetchSessionRating(selectedSessionId)
      .then((data) => {
        if (!active) return;
        setSessionRating(data);
        if (data?.rating) {
          setRatingForm({
            rating: Number(data.rating),
            reviewText: data.reviewText || ''
          });
        }
      })
      .catch(() => {
        if (!active) return;
        setSessionRating(null);
      })
      .finally(() => {
        if (active) setRatingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSessionId, selectedSession?.status, currentUser?.role]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionBilling(null);
      return;
    }

    if (String(selectedSession?.status || '').toLowerCase() !== 'completed') {
      setSessionBilling(null);
      return;
    }

    let active = true;
    fetchSessionBilling(selectedSessionId)
      .then((data) => {
        if (!active) return;
        setSessionBilling(data || null);
      })
      .catch(() => {
        if (!active) return;
        setSessionBilling(null);
      });

    return () => {
      active = false;
    };
  }, [selectedSessionId, selectedSession?.status]);

  useEffect(() => {
    if (!selectedSession?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const startTime = new Date(selectedSession.startedAt).getTime();
      const endTime = selectedSession.endedAt ? new Date(selectedSession.endedAt).getTime() : Date.now();
      const elapsed = Math.floor((endTime - startTime) / 1000);
      setElapsedSeconds(elapsed < 0 ? 0 : elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSession?.startedAt, selectedSession?.endedAt, selectedSession?.id]);

  async function onSend(event) {
    event.preventDefault();
    if (!selectedSessionId || !chatIsActive) return;

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

  async function onRespondToRequest(decision) {
    if (!selectedSessionId) return;

    try {
      const updated = await respondToSessionRequest(selectedSessionId, decision);
      setSessions((prev) => prev.map((session) => (session.id === updated.id ? updated : session)));
      setError('');
    } catch (respondError) {
      setError(respondError.message);
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

  async function onSubmitRating(event) {
    event.preventDefault();
    if (!selectedSessionId) return;

    try {
      setRatingSubmitting(true);
      setError('');
      setSuccessMessage('');
      const saved = await submitSessionRating(selectedSessionId, {
        rating: Number(ratingForm.rating),
        reviewText: ratingForm.reviewText
      });
      setSessionRating(saved);
      
      // Show success message
      setSuccessMessage('✓ Rating submitted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Notify expert to refresh their profile
      const socket = getChatSocket();
      socket.emit('expert_rating_update', {
        expertId: selectedSession?.expert?.id,
        sessionId: selectedSessionId
      });
      
      // Refresh expert list to update ratings across app
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('expertRatingUpdated', {
          detail: { expertId: selectedSession?.expert?.id }
        }));
      }, 500);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setRatingSubmitting(false);
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
              onClick={() => {
                setSelectedSessionId(session.id);
                if (typeof onSelectSession === 'function') {
                  onSelectSession(session.id);
                }
              }}
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
              {currentUser?.role === 'expert' && session.status === 'requested' ? (
                <p className="typing-line">New chat request awaiting your response</p>
              ) : null}
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
                <p className="muted">Status: {String(selectedSession.status || '').toUpperCase()}</p>
                {selectedSession.status === 'requested' && currentUser?.role === 'expert' ? (
                  <p className="muted">The student requested a chat. Please review and respond.</p>
                ) : null}
                {selectedSession.status === 'accepted_pending' ? (
                  <p className="muted">Request accepted. Chat will start when both student and expert are online.</p>
                ) : null}
                {selectedSession.status === 'declined' ? (
                  <p className="error-box session-inline-note">
                    {selectedSession.declineReason || 'This session request was declined because the expert is currently unavailable.'}
                  </p>
                ) : null}
                <p className="timer-display">⏱️ Elapsed: {formatSeconds(elapsedSeconds)}</p>
                {sessionBilling ? (
                  <div className="billing-box">
                    <p className="muted">Billing Summary</p>
                    <p className="muted">
                      {sessionBilling.billableMinutes} min x Rs {Number(sessionBilling.ratePerMinute || 0).toFixed(2)}
                      {' = '}Rs {Number(sessionBilling.amountDue || 0).toFixed(2)}
                    </p>
                    <p className="mini-id">{sessionBilling.status}</p>
                    {sessionBilling.failureReason ? <p className="error-box">{sessionBilling.failureReason}</p> : null}
                  </div>
                ) : null}
                <p className="typing-line">
                  {typingBySession[selectedSession.id]
                    ? `${typingBySession[selectedSession.id]} is typing...`
                    : `${presenceBySession[selectedSession.id] || 0} participants online`}
                </p>
              </div>
              <div className="session-actions">
                {currentUser?.role === 'expert' && selectedSession.status === 'requested' ? (
                  <>
                    <button type="button" className="secondary-btn" onClick={() => onRespondToRequest('accept')}>
                      Accept Request
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => onRespondToRequest('decline')}>
                      Decline Request
                    </button>
                  </>
                ) : null}
                {selectedSession.status === 'active' ? (
                  <button type="button" className="secondary-btn" onClick={() => onStatusChange('completed')}>
                    End Chat
                  </button>
                ) : (
                  <span className="muted">
                    {selectedSession.status === 'requested'
                      ? 'Waiting for expert decision to start chat.'
                      : selectedSession.status === 'accepted_pending'
                        ? 'Expert accepted. Waiting for both participants to be online.'
                        : 'This chat is closed.'}
                  </span>
                )}
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
                disabled={!chatIsActive}
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
                placeholder={chatIsActive ? 'Type your message' : 'Chat will be enabled when both users are online and session starts'}
                required
              />
              <button type="submit" className="primary-btn" disabled={!chatIsActive}>Send Message</button>
            </form>

            {currentUser?.role === 'student' && String(selectedSession.status || '').toLowerCase() === 'completed' ? (
              <form onSubmit={onSubmitRating} className="rating-card">
                <p className="label">Session Feedback</p>
                <h3>Rate your expert</h3>
                <p className="muted">Your rating helps improve expert quality for future students.</p>
                {ratingLoading ? <p className="muted">Loading your rating...</p> : null}

                <div className="rating-label">Rating</div>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star ${star <= ratingForm.rating ? 'filled' : ''}`}
                      onClick={() => setRatingForm((prev) => ({ ...prev, rating: star }))}
                      disabled={ratingSubmitting}
                      title={`${star} star${star !== 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="rating-text">{['Poor', 'Needs Improvement', 'Good', 'Very Good', 'Excellent'][ratingForm.rating - 1]}</div>

                <label>
                  Review (optional)
                  <textarea
                    rows="3"
                    maxLength={500}
                    value={ratingForm.reviewText}
                    onChange={(event) => setRatingForm((prev) => ({ ...prev, reviewText: event.target.value }))}
                    disabled={ratingSubmitting}
                    placeholder="Share your experience in a few words"
                  />
                </label>

                {successMessage ? <p className="success-box">{successMessage}</p> : null}

                <button type="submit" className="secondary-btn" disabled={ratingSubmitting}>
                  {ratingSubmitting ? 'Saving rating...' : sessionRating?.id ? 'Update Rating' : 'Submit Rating'}
                </button>
              </form>
            ) : null}
          </>
        )}

        {error ? <p className="error-box">{error}</p> : null}
      </div>
    </section>
  );
}

export default SessionChatPage;
