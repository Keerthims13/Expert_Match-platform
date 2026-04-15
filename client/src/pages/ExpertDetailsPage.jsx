import { useEffect, useState } from 'react';
import { fetchExpertProfile } from '../services/expertApi.js';

function ExpertDetailsPage({ expertIdentifier, onBack }) {
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Listen for expert rating updates
  useEffect(() => {
    function handleRatingUpdate(event) {
      // If the current expert's rating was updated, refresh the details
      if (event.detail?.expertId === expert?.id) {
        const loadExpert = async () => {
          try {
            const profile = await fetchExpertProfile(expertIdentifier);
            setExpert(profile);
          } catch (err) {
            console.error('Failed to refresh expert details:', err);
          }
        };
        loadExpert();
      }
    }

    window.addEventListener('expertRatingUpdated', handleRatingUpdate);
    return () => {
      window.removeEventListener('expertRatingUpdated', handleRatingUpdate);
    };
  }, [expert?.id, expertIdentifier]);

  useEffect(() => {
    let active = true;

    async function loadExpert() {
      try {
        const profile = await fetchExpertProfile(expertIdentifier);
        if (!active) return;
        setExpert(profile);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadExpert();

    return () => {
      active = false;
    };
  }, [expertIdentifier]);

  return (
    <section className="page-card detail-shell">
      <button type="button" className="link-btn" onClick={onBack} style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        ← Back to list
      </button>

      {loading ? <p className="muted">Loading expert details...</p> : null}
      {error ? <p className="error-box">{error}</p> : null}

      {expert ? (
        <div className="detail-layout">
          <div className="detail-main">
            <p className="label">Expert Details</p>
            <h1>{expert.fullName}</h1>
            <p className="detail-title">{expert.title}</p>
            <p className="detail-copy">{expert.headline}</p>

            <div className="detail-panels">
              <section className="info-panel">
                <p className="label">Skills & Expertise</p>
                <h3>Specializations</h3>
                <div className="chips compact">
                  {expert.specialties.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </section>

              <section className="info-panel">
                <p className="label">Bio</p>
                <h3>About this expert</h3>
                <p>{expert.about || 'Profile summary will appear here as experts complete their details.'}</p>
              </section>
            </div>
          </div>

          <aside className="detail-side">
            <div className="rate-box">
              <p className="label">Session Rate</p>
              <strong>${expert.pricePerMinute}/min</strong>
              <p className="subtitle" style={{ marginTop: '0.5rem' }}>Pay only for time spent</p>
            </div>
            <div className="stat-list">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</span>
                  <strong style={{ display: 'block', marginTop: '0.25rem' }}>{expert.availabilityStatus}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Reviews</span>
                  <strong style={{ display: 'block', marginTop: '0.25rem' }}>{expert.reviewCount}</strong>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sessions</span>
                  <strong style={{ display: 'block', marginTop: '0.25rem' }}>{expert.consultations}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Success Rate</span>
                  <strong style={{ display: 'block', marginTop: '0.25rem' }}>{expert.successRate}%</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export default ExpertDetailsPage;
