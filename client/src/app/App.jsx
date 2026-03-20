import { useEffect, useState } from 'react';
import ExpertProfilePage from '../pages/ExpertProfilePage.jsx';
import ExpertsListPage from '../pages/ExpertsListPage.jsx';
import ExpertDetailsPage from '../pages/ExpertDetailsPage.jsx';
import DoubtBoardPage from '../pages/DoubtBoardPage.jsx';
import SessionChatPage from '../pages/SessionChatPage.jsx';
import AuthPage from '../pages/AuthPage.jsx';
import { fetchCurrentUser } from '../services/authApi.js';
import { getAuthToken, setAuthToken } from '../services/httpClient.js';

function App() {
  const [view, setView] = useState('create');
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      setAuthLoading(false);
      return;
    }

    fetchCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        setAuthToken('');
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  function renderView() {
    if (view === 'list') {
      return (
        <ExpertsListPage
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

    return <ExpertProfilePage onExploreExperts={() => setView('list')} />;
  }

  if (authLoading) {
    return <main className="app-content"><p className="muted">Checking login...</p></main>;
  }

  if (!currentUser) {
    return (
      <main className="app-content">
        <AuthPage onAuthenticated={setCurrentUser} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <p className="brand-mark">ExpertMatch</p>
        <p className="muted">{currentUser.fullName} ({currentUser.role})</p>
        <button type="button" className={`nav-btn ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>
          Create Profile
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
          }}
        >
          Logout
        </button>
      </aside>
      <section className="app-content">{renderView()}</section>
    </main>
  );
}

export default App;
