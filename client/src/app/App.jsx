import { useState } from 'react';
import ExpertProfilePage from '../pages/ExpertProfilePage.jsx';
import ExpertsListPage from '../pages/ExpertsListPage.jsx';
import ExpertDetailsPage from '../pages/ExpertDetailsPage.jsx';
import DoubtBoardPage from '../pages/DoubtBoardPage.jsx';
import SessionChatPage from '../pages/SessionChatPage.jsx';

function App() {
  const [view, setView] = useState('create');
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

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
          onOpenSession={(session) => {
            setSelectedSessionId(session.id);
            setView('sessions');
          }}
        />
      );
    }

    if (view === 'sessions') {
      return <SessionChatPage initialSessionId={selectedSessionId} />;
    }

    return <ExpertProfilePage onExploreExperts={() => setView('list')} />;
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <p className="brand-mark">ExpertMatch</p>
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
      </aside>
      <section className="app-content">{renderView()}</section>
    </main>
  );
}

export default App;
