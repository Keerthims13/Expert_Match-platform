import { useEffect, useMemo, useState } from 'react';
import { fetchExpertList, searchExperts, toggleExpertBookmark, fetchUserBookmarks } from '../services/expertApi.js';
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
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [bookmarkingId, setBookmarkingId] = useState(null);

  // Filter states
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  const [availability, setAvailability] = useState('all');
  const [category, setCategory] = useState('all');
  const [filtersApplied, setFiltersApplied] = useState(false);

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
    let result = experts;

    // Text search
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((expert) => {
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
    }

    return result;
  }, [experts, searchQuery]);

  const assignableDoubts = doubts.filter((doubt) => !doubt.assignedExpert);
  const resolvedSelectedDoubtId = selectedDoubtId || (assignableDoubts.length === 1 ? String(assignableDoubts[0].id) : '');

  // Load user bookmarks
  useEffect(() => {
    if (!currentUser?.id) return;
    
    (async () => {
      try {
        const bookmarks = await fetchUserBookmarks();
        const bookmarkSet = new Set(bookmarks.map(b => b.id));
        setBookmarkedIds(bookmarkSet);
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    })();
  }, [currentUser?.id]);

  // Load experts initially
  useEffect(() => {
    let active = true;

    async function loadExperts() {
      try {
        const data = await fetchExpertList();
        if (!active) return;
        setExperts(data);
        setFiltersApplied(false);
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

  // Load doubts
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

  // Listen for expert rating updates
  useEffect(() => {
    function handleRatingUpdate() {
      const loadExperts = async () => {
        try {
          const data = filtersApplied ? await searchExperts({minRating, maxPrice, availability, category}) : await fetchExpertList();
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
  }, [filtersApplied, minRating, maxPrice, availability, category]);

  async function handleApplyFilters() {
    try {
      setLoading(true);
      setError('');
      const data = await searchExperts({
        minRating: minRating || undefined,
        maxPrice: maxPrice || undefined,
        availability: availability !== 'all' ? availability : undefined,
        category: category !== 'all' ? category : undefined
      });
      setExperts(data);
      setFiltersApplied(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilters() {
    setMinRating(0);
    setMaxPrice(500);
    setAvailability('all');
    setCategory('all');
    setSearchQuery('');
    setLoading(true);
    setError('');
    
    (async () => {
      try {
        const data = await fetchExpertList();
        setExperts(data);
        setFiltersApplied(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }

  async function handleToggleBookmark(expert) {
    try {
      setBookmarkingId(expert.id);
      setError('');
      const result = await toggleExpertBookmark(expert.id);
      
      if (result.bookmarked) {
        setBookmarkedIds(prev => new Set([...prev, expert.id]));
      } else {
        setBookmarkedIds(prev => {
          const updated = new Set(prev);
          updated.delete(expert.id);
          return updated;
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBookmarkingId(null);
    }
  }

  const categories = ['all', 'JavaScript', 'Python', 'Data Science', 'UI/UX', 'DevOps'];
  const availabilities = ['all', 'available', 'busy', 'offline'];

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="label">Developer Directory</p>
          <h1>Browse all experts</h1>
          <p className="subtitle">Pick any expert you prefer. If you have one open doubt, assignment is one-click.</p>
        </div>
        <div className="summary-pill">{filteredExperts.length} experts</div>
      </div>

      {loading ? <p className="muted">Loading experts...</p> : null}
      {error ? <p className="error-box">{error}</p> : null}
      {success ? <p className="success-box">{success}</p> : null}

      {currentUser?.role === 'student' && assignableDoubts.length > 1 ? (
        <label className="profile-form directory-filter-form">
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

      <label className="profile-form directory-search-form">
        <span style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>🔍 Find your expert</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, skill, title or category..."
        />
      </label>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Minimum Rating</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span>{minRating}</span>
            </div>
          </div>

          <div className="filter-group">
            <label>Max Price ($/min)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="range"
                min="0"
                max="500"
                step="1"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span>${maxPrice}</span>
            </div>
          </div>

          <div className="filter-group">
            <label>Availability</label>
            <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
              {availabilities.map(avail => (
                <option key={avail} value={avail}>
                  {avail === 'all' ? 'All Statuses' : avail.charAt(0).toUpperCase() + avail.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filters-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="primary-btn" onClick={handleApplyFilters} disabled={loading}>
            {loading ? 'Applying...' : 'Apply Filters'}
          </button>
          <button className="secondary-btn" onClick={handleResetFilters} disabled={loading}>
            Reset
          </button>
        </div>
      </div>

      {!loading && !filteredExperts.length ? (
        <p className="muted">No experts match your search.</p>
      ) : null}

      <div className="directory-grid">
        {filteredExperts.map((expert) => (
          <article key={expert.id} className="directory-card">
            <div className="directory-card-head">
              <span className={`status-badge ${expert.availabilityStatus}`}>{expert.availabilityStatus}</span>
              <button
                type="button"
                className={`bookmark-btn ${bookmarkedIds.has(expert.id) ? 'bookmarked' : ''}`}
                onClick={() => handleToggleBookmark(expert)}
                disabled={bookmarkingId === expert.id}
                title={bookmarkedIds.has(expert.id) ? 'Remove bookmark' : 'Add bookmark'}
                aria-label={bookmarkedIds.has(expert.id) ? 'Remove from favorites' : 'Add to favorites'}
              >
                {bookmarkingId === expert.id ? '⏳' : bookmarkedIds.has(expert.id) ? '❤️' : '🤍'}
              </button>
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
                      const result = await assignExpertToDoubt(resolvedSelectedDoubtId, expert.id);
                      const requestSent = Boolean(result?.requestCreated) || String(result?.session?.status || '').toLowerCase() === 'requested';
                      setSuccess(
                        requestSent
                          ? `Assigned ${expert.fullName} and sent chat request. Expert can accept or decline in Sessions.`
                          : `Assigned ${expert.fullName} to doubt #${resolvedSelectedDoubtId}.`
                      );
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
