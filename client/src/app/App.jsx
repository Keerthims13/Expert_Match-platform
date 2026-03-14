import { useState } from 'react';
import ExpertProfilePage from '../pages/ExpertProfilePage.jsx';
import ExpertsListPage from '../pages/ExpertsListPage.jsx';
import ExpertDetailsPage from '../pages/ExpertDetailsPage.jsx';
import DoubtBoardPage from '../pages/DoubtBoardPage.jsx';

function App() {
  const [view, setView] = useState('create');
  const [selectedExpert, setSelectedExpert] = useState(null);

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
      return <DoubtBoardPage />;
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
      </aside>
      <section className="app-content">{renderView()}</section>
    </main>
  );
}

export default App;
