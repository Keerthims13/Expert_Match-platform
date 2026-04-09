import { useEffect, useMemo, useState } from 'react';
import { fetchExpertList } from '../services/expertApi.js';
import { assignExpertToDoubt, fetchDoubts } from '../services/doubtApi.js';

const fallbackAvatar =
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80';

function ExpertsListPage({ onSelectExpert, currentUser }) {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doubts, setDoubts] = useState([]);
  const [selectedDoubtId, setSelectedDoubtId] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  function renderRatingStars(rating) {
    const normalized = Math.max(0, Math.min(5, Number(rating) || 0));
    const fullStars = Math.round(normalized);

    return [1, 2, 3, 4, 5].map((index) => (
      <span
        key={index}
        className={`rating-star ${index <= fullStars ? 'filled' : ''}`}
        aria-hidden="true"
      >
        ★
      </span>
    ));
  }

  const filteredExperts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return experts;

    return experts.filter((expert) => {
      const haystack = [
        expert.fullName,
        expert.title,
        expert.headline,
        expert.category,
        ...(expert.specialties || [])
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [experts, searchQuery]);

  const assignableDoubts = doubts.filter((doubt) => !doubt.assignedExpert);
  const resolvedSelectedDoubtId = selectedDoubtId || (assignableDoubts.length === 1 ? String(assignableDoubts[0].id) : '');

  // Listen for expert rating updates
  useEffect(() => {
    function handleRatingUpdate() {
      // Refresh expert list when a rating is submitted
      const loadExperts = async () => {
        try {
          const data = await fetchExpertList();
          setExperts(data);
        } catch (err) {
          console.error('Failed to refresh experts:', err);
        }
      };
      loadExperts();
    }

    window.addEventListener('expertRatingUpdated', handleRatingUpdate);
    return () => {
      window.removeEventListener('expertRatingUpdated', handleRatingUpdate);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadExperts() {
      try {
        const data = await fetchExpertList();
        if (!active) return;
        setExperts(data);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadExperts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDoubts() {
      try {
        const items = await fetchDoubts();
        if (!active) return;
        setDoubts(items);
        if (items.length) {
          setSelectedDoubtId(String(items[0].id));
        }
      } catch (_error) {
        if (!active) return;
      }
    }

    loadDoubts();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="label">Developer Directory</p>
          <h1>Browse all experts</h1>
          <p className="subtitle">Pick any expert you prefer. If you have one open doubt, assignment is one-click.</p>
        </div>
        <div className="summary-pill">{experts.length} experts</div>
      </div>

      {loading ? <p className="muted">Loading experts...</p> : null}
      {error ? <p className="error-box">{error}</p> : null}
      {success ? <p className="success-box">{success}</p> : null}

      {currentUser?.role === 'student' && assignableDoubts.length > 1 ? (
        <label className="profile-form" style={{ marginTop: '0.75rem' }}>
          Step 1: Choose your open doubt
          <select value={resolvedSelectedDoubtId} onChange={(event) => setSelectedDoubtId(event.target.value)}>
            {assignableDoubts.map((doubt) => (
              <option key={doubt.id} value={doubt.id}>
                #{doubt.id} {doubt.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {currentUser?.role === 'student' && assignableDoubts.length === 1 ? (
        <p className="muted">Auto-selected doubt: #{assignableDoubts[0].id} {assignableDoubts[0].title}</p>
      ) : null}

      {currentUser?.role === 'student' && !assignableDoubts.length ? (
        <p className="muted">No open doubts to assign. Create a new doubt first from Post Doubts.</p>
      ) : null}

      <label className="profile-form" style={{ marginTop: '0.65rem' }}>
        Search experts
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, skill, title or category"
        />
      </label>

      {!loading && !filteredExperts.length ? (
        <p className="muted">No experts match your search.</p>
      ) : null}

      <div className="directory-grid">
        {filteredExperts.map((expert) => (
          <article key={expert.id} className="directory-card">
            <div className="directory-card-head">
              <span className={`status-badge ${expert.availabilityStatus}`}>{expert.availabilityStatus}</span>
              <span className="mini-id">#{expert.id}</span>
            </div>

            <div className="directory-avatar-wrap">
              <img
                src={expert.profileImageUrl || fallbackAvatar}
                alt={`${expert.fullName} profile`}
                className="directory-avatar"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = fallbackAvatar;
                }}
              />
            </div>

            <div className="directory-card-titleblock">
              <h2>{expert.fullName}</h2>
              <p className="card-subtitle">{expert.title}</p>
            </div>

            <p className="card-copy">{expert.headline}</p>

            <div className="rating-strip" aria-label={`${expert.reviewCount || 0} reviews`}>
              <div className="rating-stars">{renderRatingStars(expert.rating)}</div>
              <span className="rating-count">{expert.reviewCount || 0} reviews</span>
            </div>

            <div className="chips compact">
              {expert.specialties.slice(0, 4).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>

            <div className="meta-row">
              <strong>${expert.pricePerMinute}/min</strong>
              <span className="muted">{expert.category || 'General'}</span>
            </div>

            <div className="directory-actions">
              <button type="button" className="secondary-btn" onClick={() => onSelectExpert(expert)}>
                View Details
              </button>
              {currentUser?.role === 'student' ? (
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={!resolvedSelectedDoubtId || assigningId === expert.id}
                  onClick={async () => {
                    try {
                      setAssigningId(expert.id);
                      setError('');
                      setSuccess('');
                      await assignExpertToDoubt(resolvedSelectedDoubtId, expert.id);
                      setSuccess(`Assigned ${expert.fullName} to doubt #${resolvedSelectedDoubtId}.`);
                    } catch (assignError) {
                      setError(assignError.message);
                    } finally {
                      setAssigningId(null);
                    }
                  }}
                >
                  {assigningId === expert.id ? 'Assigning...' : 'Assign This Expert'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ExpertsListPage;
