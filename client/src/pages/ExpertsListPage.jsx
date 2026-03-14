import { useEffect, useState } from 'react';
import { fetchExpertList } from '../services/expertApi.js';

function ExpertsListPage({ onSelectExpert }) {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <section className="page-card">
      <div className="page-header">
        <div>
          <p className="label">Developer Directory</p>
          <h1>Browse all experts</h1>
          <p className="subtitle">This page uses GET /api/experts and lists every profile saved so far.</p>
        </div>
        <div className="summary-pill">{experts.length} experts</div>
      </div>

      {loading ? <p className="muted">Loading experts...</p> : null}
      {error ? <p className="error-box">{error}</p> : null}

      <div className="directory-grid">
        {experts.map((expert) => (
          <article key={expert.id} className="directory-card">
            <div className="directory-topline">
              <span className={`status-badge ${expert.availabilityStatus}`}>{expert.availabilityStatus}</span>
              <span className="mini-id">#{expert.id}</span>
            </div>
            <h2>{expert.fullName}</h2>
            <p className="card-subtitle">{expert.title}</p>
            <p className="card-copy">{expert.headline}</p>
            <div className="chips compact">
              {expert.specialties.slice(0, 4).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
            <div className="meta-row">
              <strong>${expert.pricePerMinute}/min</strong>
              <span>{expert.rating} rating</span>
            </div>
            <button type="button" className="secondary-btn" onClick={() => onSelectExpert(expert)}>
              View Details
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ExpertsListPage;
