import { useEffect, useState } from 'react';
import { fetchUserBookmarks, toggleExpertBookmark } from '../services/expertApi.js';

const fallbackAvatar =
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80';

function FavoritesPage({ onSelectExpert, currentUser }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadBookmarks() {
      try {
        setLoading(true);
        const data = await fetchUserBookmarks();
        if (!active) return;
        setBookmarks(data);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (currentUser?.id) {
      loadBookmarks();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  async function handleRemoveBookmark(expertId) {
    try {
      setTogglingId(expertId);
      setError('');
      await toggleExpertBookmark(expertId);
      setBookmarks((prev) => prev.filter((expert) => expert.id !== expertId));
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="label">Saved Experts</p>
          <h1>Your favorites</h1>
          <p className="subtitle">Bookmarks are saved in the database, so they stay after refresh and sign-in.</p>
        </div>
        <div className="summary-pill">{bookmarks.length} saved</div>
      </div>

      {loading ? <p className="muted">Loading saved experts...</p> : null}
      {error ? <p className="error-box">{error}</p> : null}

      {!loading && !bookmarks.length ? <p className="muted">No favorites saved yet. Use the heart button in the expert directory.</p> : null}

      <div className="directory-grid">
        {bookmarks.map((expert) => (
          <article key={expert.id} className="directory-card">
            <div className="directory-card-head">
              <span className={`status-badge ${expert.availabilityStatus}`}>{expert.availabilityStatus}</span>
              <button
                type="button"
                className="bookmark-btn bookmarked"
                onClick={() => handleRemoveBookmark(expert.id)}
                disabled={togglingId === expert.id}
                title="Remove from favorites"
              >
                {togglingId === expert.id ? '⏳' : '❤️'}
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

            <div className="meta-row">
              <strong>${expert.pricePerMinute}/min</strong>
              <span className="muted">{expert.category || 'General'}</span>
            </div>

            <div className="directory-actions">
              <button type="button" className="secondary-btn" onClick={() => onSelectExpert(expert)}>
                View Details
              </button>
              <button type="button" className="secondary-btn" onClick={() => handleRemoveBookmark(expert.id)} disabled={togglingId === expert.id}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FavoritesPage;
