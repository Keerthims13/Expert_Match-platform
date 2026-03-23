import { useEffect, useState } from 'react';
import ExpertProfilePage from '../pages/ExpertProfilePage.jsx';
import ExpertsListPage from '../pages/ExpertsListPage.jsx';
import ExpertDetailsPage from '../pages/ExpertDetailsPage.jsx';
import DoubtBoardPage from '../pages/DoubtBoardPage.jsx';
import SessionChatPage from '../pages/SessionChatPage.jsx';
import AuthPage from '../pages/AuthPage.jsx';
import { fetchCurrentUser } from '../services/authApi.js';
import { getAuthToken, setAuthToken } from '../services/httpClient.js';
import { fetchMyExpertProfile } from '../services/expertApi.js';
import { getChatSocket } from '../services/chatSocket.js';

function App() {
  const [view, setView] = useState('profile');
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [expertProfileReady, setExpertProfileReady] = useState(false);

  async function applyAuthenticatedUserFromToken() {
    const user = await fetchCurrentUser();
    setCurrentUser(user);

    if (user.role === 'expert') {
      try {
        await fetchMyExpertProfile();
        setExpertProfileReady(true);
        setView('sessions');
      } catch (_error) {
        setExpertProfileReady(false);
        setView('profile');
      }
    } else {
      setExpertProfileReady(false);
      setView('doubts');
    }
  }

  function getDefaultView(user, profileReady) {
    if (!user) return 'doubts';
    if (user.role === 'expert') {
      return profileReady ? 'sessions' : 'profile';
    }
    return 'doubts';
  }

  useEffect(() => {
    if (!getAuthToken()) {
      setAuthLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(async (user) => {
        setCurrentUser(user);

        if (user.role === 'expert') {
          try {
            await fetchMyExpertProfile();
            setExpertProfileReady(true);
            setView(getDefaultView(user, true));
          } catch (_error) {
            setExpertProfileReady(false);
            setView('profile');
          }
        } else {
          setExpertProfileReady(false);
          setView(getDefaultView(user, false));
        }
      })
      .catch(() => {
        setAuthToken('');
        setCurrentUser(null);
        setExpertProfileReady(false);
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
      if (currentUser.role !== 'expert') return;
      const sessionId = Number(payload?.session?.id || payload?.sessionId);
      if (!sessionId) return;
      setSelectedSessionId(sessionId);
      setView('sessions');
    }

    socket.on('session_request_created', onSessionRequestCreated);

    return () => {
      socket.off('session_request_created', onSessionRequestCreated);
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
            setSelectedExpert(expert);
            setView('detail');
          }}
        />
      );
    }

    if (view === 'detail') {
      return (
        <ExpertDetailsPage
          expertIdentifier={selectedExpert?.slug || selectedExpert?.id}
          onBack={() => setView('list')}
        />
      );
    }

    if (view === 'doubts') {
      return (
        <DoubtBoardPage
          currentUser={currentUser}
          onOpenSession={(session) => {
            setSelectedSessionId(session.id);
            setView('sessions');
          }}
        />
      );
    }

    if (view === 'sessions') {
      return <SessionChatPage initialSessionId={selectedSessionId} currentUser={currentUser} />;
    }

    return (
      <ExpertProfilePage
        currentUser={currentUser}
        onProfileCreated={() => {
          setExpertProfileReady(true);
          setView('sessions');
        }}
        onExploreExperts={() => setView('list')}
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
      <aside className="app-sidebar">
        <p className="brand-mark">ExpertMatch</p>
        <p className="muted">{currentUser.fullName} ({currentUser.role})</p>
        <button type="button" className={`nav-btn ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
          My Profile
        </button>
        <button type="button" className={`nav-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
          All Developers
        </button>
        <button type="button" className={`nav-btn ${view === 'doubts' ? 'active' : ''}`} onClick={() => setView('doubts')}>
          Post Doubts
        </button>
        <button
          type="button"
          className={`nav-btn ${view === 'sessions' ? 'active' : ''}`}
          onClick={() => setView('sessions')}
        >
          Sessions Chat
        </button>
        <button
          type="button"
          className="nav-btn"
          onClick={() => {
            setAuthToken('');
            setCurrentUser(null);
            setExpertProfileReady(false);
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
