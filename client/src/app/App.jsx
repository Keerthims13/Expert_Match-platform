import { useEffect, useState } from 'react';
import ExpertProfilePage from '../pages/ExpertProfilePage.jsx';
import ExpertsListPage from '../pages/ExpertsListPage.jsx';
import ExpertDetailsPage from '../pages/ExpertDetailsPage.jsx';
import DoubtBoardPage from '../pages/DoubtBoardPage.jsx';
import SessionChatPage from '../pages/SessionChatPage.jsx';
import AuthPage from '../pages/AuthPage.jsx';
import WalletPage from '../pages/WalletPage.jsx';
import { fetchCurrentUser } from '../services/authApi.js';
import { getAuthToken, setAuthToken } from '../services/httpClient.js';
import { fetchMyExpertProfile } from '../services/expertApi.js';
import { getChatSocket } from '../services/chatSocket.js';
import { fetchSessions } from '../services/sessionApi.js';

function parsePath(pathname) {
  const cleanPath = String(pathname || '/').replace(/\/+$/, '') || '/';

  if (cleanPath === '/auth') return { view: 'auth' };
  if (cleanPath === '/profile') return { view: 'profile' };
  if (cleanPath === '/experts') return { view: 'list' };
  if (cleanPath === '/doubts') return { view: 'doubts' };
  if (cleanPath === '/sessions') return { view: 'sessions' };
  if (cleanPath === '/wallet') return { view: 'wallet' };

  const expertMatch = cleanPath.match(/^\/experts\/([^/]+)$/);
  if (expertMatch) {
    return {
      view: 'detail',
      expertIdentifier: decodeURIComponent(expertMatch[1])
    };
  }

  const sessionMatch = cleanPath.match(/^\/sessions\/(\d+)$/);
  if (sessionMatch) {
    return {
      view: 'sessions',
      sessionId: Number(sessionMatch[1])
    };
  }

  return { view: null };
}

function pathForView(view, options = {}) {
  if (view === 'auth') return '/auth';
  if (view === 'profile') return '/profile';
  if (view === 'list') return '/experts';
  if (view === 'doubts') return '/doubts';
  if (view === 'wallet') return '/wallet';
  if (view === 'sessions') {
    const sessionId = Number(options.sessionId);
    return Number.isInteger(sessionId) && sessionId > 0 ? `/sessions/${sessionId}` : '/sessions';
  }
  if (view === 'detail') {
    const identifier = String(options.expertIdentifier || '').trim();
    return identifier ? `/experts/${encodeURIComponent(identifier)}` : '/experts';
  }
  return '/';
}

function App() {
  const [view, setView] = useState('profile');
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [detailIdentifier, setDetailIdentifier] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [expertProfileReady, setExpertProfileReady] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  function pushToast(message, tone = 'info') {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }

  function getDefaultView(user, profileReady) {
    if (!user) return 'doubts';
    if (user.role === 'expert') {
      return profileReady ? 'sessions' : 'profile';
    }
    return 'doubts';
  }

  function navigateTo(nextView, options = {}) {
    const resolvedExpertIdentifier = options.expertIdentifier || detailIdentifier;
    const resolvedSessionId = options.sessionId || selectedSessionId;

    if (nextView === 'detail') {
      if (resolvedExpertIdentifier) {
        setDetailIdentifier(String(resolvedExpertIdentifier));
      }
    }

    if (nextView === 'sessions' && resolvedSessionId) {
      setSelectedSessionId(Number(resolvedSessionId));
    }

    setView(nextView);

    const nextPath = pathForView(nextView, {
      expertIdentifier: resolvedExpertIdentifier,
      sessionId: resolvedSessionId
    });

    if (window.location.pathname !== nextPath) {
      const action = options.replace ? 'replaceState' : 'pushState';
      window.history[action]({}, '', nextPath);
    }
  }

  function applyRouteFromPath(pathname, { replace = false } = {}) {
    const route = parsePath(pathname);
    if (!route.view) return false;

    if (route.view === 'detail') {
      setDetailIdentifier(route.expertIdentifier || '');
      setSelectedExpert(null);
    }

    if (route.view === 'sessions' && route.sessionId) {
      setSelectedSessionId(route.sessionId);
    }

    navigateTo(route.view, {
      expertIdentifier: route.expertIdentifier,
      sessionId: route.sessionId,
      replace
    });

    return true;
  }

  async function applyAuthenticatedUserFromToken() {
    const user = await fetchCurrentUser();
    setCurrentUser(user);

    let profileReady = false;

    if (user.role === 'expert') {
      try {
        await fetchMyExpertProfile();
        setExpertProfileReady(true);
        profileReady = true;
      } catch (_error) {
        setExpertProfileReady(false);
        profileReady = false;
      }
    } else {
      setExpertProfileReady(false);
      profileReady = false;
    }

    const route = parsePath(window.location.pathname);
    const defaultView = getDefaultView(user, profileReady);
    const nextView = route.view && route.view !== 'auth' ? route.view : defaultView;

    navigateTo(nextView, {
      expertIdentifier: route.expertIdentifier,
      sessionId: route.sessionId,
      replace: true
    });
  }

  useEffect(() => {
    function onPopState() {
      applyRouteFromPath(window.location.pathname, { replace: true });
    }

    window.addEventListener('popstate', onPopState);
    applyRouteFromPath(window.location.pathname, { replace: true });

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      setAuthLoading(false);
      navigateTo('auth', { replace: true });
      return;
    }

    fetchCurrentUser()
      .then(async (user) => {
        setCurrentUser(user);

        let profileReady = false;
        if (user.role === 'expert') {
          try {
            await fetchMyExpertProfile();
            profileReady = true;
          } catch (_error) {
            profileReady = false;
          }
        }

        setExpertProfileReady(profileReady);

        const route = parsePath(window.location.pathname);
        const defaultView = getDefaultView(user, profileReady);
        const nextView = route.view && route.view !== 'auth' ? route.view : defaultView;

        navigateTo(nextView, {
          expertIdentifier: route.expertIdentifier,
          sessionId: route.sessionId,
          replace: true
        });
      })
      .catch(() => {
        setAuthToken('');
        setCurrentUser(null);
        setExpertProfileReady(false);
        navigateTo('auth', { replace: true });
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    const socket = getChatSocket();
    socket.emit('register_user', {
      userId: currentUser.id,
      fullName: currentUser.fullName,
      role: currentUser.role
    });

    function onSessionRequestCreated(payload) {
      const session = payload?.session;
      const sessionId = Number(session?.id || payload?.sessionId);
      if (!sessionId) return;

      if (currentUser.role !== 'expert') return;
      pushToast(`New chat request for "${session?.doubt?.title || 'a doubt'}"`, 'info');
    }

    function onSessionRequestResponded(payload) {
      const decision = String(payload?.decision || '').toLowerCase();
      const title = payload?.session?.doubt?.title || 'your doubt';

      if (currentUser.role === 'student') {
        if (decision === 'accept') {
          pushToast(`Your request for "${title}" was accepted by the expert.`, 'success');
        } else if (decision === 'decline') {
          pushToast(`Your request for "${title}" was declined by the expert.`, 'error');
        }
      }
    }

    function onSessionStatusUpdated(payload) {
      const status = String(payload?.session?.status || '').toLowerCase();
      const title = payload?.session?.doubt?.title || 'session';
      if (status === 'active') {
        pushToast(`Chat started for "${title}".`, 'success');
      }
    }

    socket.on('session_request_created', onSessionRequestCreated);
    socket.on('session_request_responded', onSessionRequestResponded);
    socket.on('session_status_updated', onSessionStatusUpdated);

    return () => {
      socket.off('session_request_created', onSessionRequestCreated);
      socket.off('session_request_responded', onSessionRequestResponded);
      socket.off('session_status_updated', onSessionStatusUpdated);
    };
  }, [currentUser?.id, currentUser?.role, detailIdentifier, selectedSessionId, view]);

  useEffect(() => {
    if (!currentUser?.id) return;

    let active = true;

    async function pollSessionNotifications() {
      try {
        const sessions = await fetchSessions();
        if (!active) return;

        sessions.forEach((session) => {
          const status = String(session?.status || '').toLowerCase();
          const title = session?.doubt?.title || 'session';
          const key = `seen_session_event_${session.id}_${status}`;
          if (sessionStorage.getItem(key)) return;

          if (currentUser.role === 'student') {
            if (status === 'accepted_pending') {
              pushToast(`Request accepted! "${title}" - Expert is waiting. Go to Sessions Chat to start.`, 'success');
              sessionStorage.setItem(key, '1');
              return;
            }
            if (status === 'declined') {
              pushToast(`Request declined for "${title}". Try another expert.`, 'error');
              sessionStorage.setItem(key, '1');
              return;
            }
          }

          if (currentUser.role === 'expert' && status === 'requested') {
            pushToast(`New request: "${title}" - Student is waiting for your response.`, 'info');
            sessionStorage.setItem(key, '1');
            return;
          }

          if (status === 'active') {
            pushToast(`Chat started for "${title}" - You can now message!`, 'success');
            sessionStorage.setItem(key, '1');
          }
        });
      } catch (_error) {
        if (!active) return;
      }
    }

    const interval = setInterval(pollSessionNotifications, 5000);
    function onFocus() {
      pollSessionNotifications();
    }

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    pollSessionNotifications();

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'expert') {
      setPendingRequestCount(0);
      return;
    }

    let active = true;

    async function updatePendingCount() {
      try {
        const sessions = await fetchSessions();
        if (!active) return;

        const pendingCount = sessions.filter((s) => {
          const status = String(s?.status || '').toLowerCase();
          return status === 'requested';
        }).length;

        setPendingRequestCount(pendingCount);
      } catch (_error) {
        if (!active) return;
      }
    }

    const interval = setInterval(updatePendingCount, 5000);
    updatePendingCount();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?.id) return;

    let active = true;

    async function syncUser() {
      try {
        const latest = await fetchCurrentUser();
        if (!active) return;
        setCurrentUser((prev) => {
          if (!prev) return latest;
          if (
            Number(prev.id) === Number(latest.id)
            && String(prev.role || '') === String(latest.role || '')
            && String(prev.fullName || '') === String(latest.fullName || '')
          ) {
            return prev;
          }
          return latest;
        });
      } catch (_error) {
        if (!active) return;
      }
    }

    const interval = setInterval(syncUser, 15000);
    function onFocus() {
      syncUser();
    }

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [currentUser?.id]);

  function renderView() {
    if (view === 'list') {
      return (
        <ExpertsListPage
          currentUser={currentUser}
          onSelectExpert={(expert) => {
            const identifier = expert?.slug || expert?.id;
            setSelectedExpert(expert);
            setDetailIdentifier(String(identifier || ''));
            navigateTo('detail', { expertIdentifier: identifier });
          }}
        />
      );
    }

    if (view === 'detail') {
      return (
        <ExpertDetailsPage
          expertIdentifier={selectedExpert?.slug || selectedExpert?.id || detailIdentifier}
          onBack={() => navigateTo('list')}
        />
      );
    }

    if (view === 'doubts') {
      return (
        <DoubtBoardPage
          currentUser={currentUser}
          onOpenSession={(session) => {
            setSelectedSessionId(session.id);
            navigateTo('sessions', { sessionId: session.id });
          }}
        />
      );
    }

    if (view === 'sessions') {
      return (
        <SessionChatPage
          initialSessionId={selectedSessionId}
          currentUser={currentUser}
          onSelectSession={(sessionId) => {
            const numeric = Number(sessionId);
            if (!Number.isInteger(numeric) || numeric <= 0) return;
            setSelectedSessionId(numeric);
            navigateTo('sessions', { sessionId: numeric, replace: true });
          }}
        />
      );
    }

    if (view === 'wallet') {
      return <WalletPage currentUser={currentUser} />;
    }

    return (
      <ExpertProfilePage
        currentUser={currentUser}
        onProfileCreated={() => {
          setExpertProfileReady(true);
          navigateTo('sessions');
        }}
        onExploreExperts={() => navigateTo('list')}
      />
    );
  }

  if (authLoading) {
    return <main className="app-content"><p className="muted">Checking login...</p></main>;
  }

  if (!currentUser) {
    return (
      <main className="app-content">
        <AuthPage
          onAuthenticated={async () => {
            await applyAuthenticatedUserFromToken();
          }}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      {toasts.length ? (
        <div className="toast-stack">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.tone}`}>
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
      <aside className="app-sidebar">
        <p className="brand-mark">ExpertMatch</p>
        <p className="muted">{currentUser.fullName} ({currentUser.role})</p>
        <button type="button" className={`nav-btn ${view === 'profile' ? 'active' : ''}`} onClick={() => navigateTo('profile')}>
          My Profile
        </button>
        <button type="button" className={`nav-btn ${view === 'list' || view === 'detail' ? 'active' : ''}`} onClick={() => navigateTo('list')}>
          All Developers
        </button>
        <button type="button" className={`nav-btn ${view === 'doubts' ? 'active' : ''}`} onClick={() => navigateTo('doubts')}>
          Post Doubts
        </button>
        <button
          type="button"
          className={`nav-btn ${view === 'sessions' ? 'active' : ''}`}
          onClick={() => navigateTo('sessions')}
          style={{ position: 'relative' }}
        >
          Sessions Chat
          {currentUser?.role === 'expert' && pendingRequestCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: '#ff4444',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {pendingRequestCount}
            </span>
          )}
        </button>
        <button type="button" className={`nav-btn ${view === 'wallet' ? 'active' : ''}`} onClick={() => navigateTo('wallet')}>
          Wallet
        </button>
        <button
          type="button"
          className="nav-btn"
          onClick={() => {
            setAuthToken('');
            setCurrentUser(null);
            setExpertProfileReady(false);
            navigateTo('auth', { replace: true });
          }}
        >
          Logout
        </button>
      </aside>
      <section key={view} className="app-content">{renderView()}</section>
    </main>
  );
}

export default App;
