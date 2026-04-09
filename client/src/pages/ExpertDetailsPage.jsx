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
      <button type="button" className="link-btn" onClick={onBack}>
        Back to list
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
                <h3>Skills</h3>
                <div className="chips compact">
                  {expert.specialties.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </section>

              <section className="info-panel">
                <h3>About</h3>
                <p>{expert.about || 'Profile summary will appear here as experts complete their details.'}</p>
              </section>
            </div>
          </div>

          <aside className="detail-side">
            <div className="rate-box">
              <p className="label">Pricing</p>
              <strong>${expert.pricePerMinute}/min</strong>
            </div>
            <div className="stat-list">
              <div><span>Status</span><strong>{expert.availabilityStatus}</strong></div>
              <div><span>Consultations</span><strong>{expert.consultations}</strong></div>
              <div><span>Reviews</span><strong>{expert.reviewCount}</strong></div>
              <div><span>Success</span><strong>{expert.successRate}%</strong></div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export default ExpertDetailsPage;
