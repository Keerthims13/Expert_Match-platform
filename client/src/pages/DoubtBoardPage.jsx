import { useEffect, useState } from 'react';
import { assignExpertToDoubt, createDoubt, fetchDoubtMatches, fetchDoubts } from '../services/doubtApi.js';
import { createSession } from '../services/sessionApi.js';

const initialForm = {
  requesterName: '',
  title: '',
  description: '',
  category: 'Development'
};

function DoubtBoardPage({ onOpenSession, currentUser }) {
  const [form, setForm] = useState(initialForm);
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [matchState, setMatchState] = useState({ doubtId: null, loading: false, error: '', data: null });

  async function loadDoubts() {
    try {
      const data = await fetchDoubts();
      setDoubts(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoubts();
  }, []);

  useEffect(() => {
    if (currentUser?.fullName) {
      setForm((prev) => ({
        ...prev,
        requesterName: prev.requesterName || currentUser.fullName
      }));
    }
  }, [currentUser]);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createDoubt({
        ...form,
        requesterName: currentUser?.fullName || form.requesterName
      });
      setSuccess('Doubt posted successfully.');
      setForm((prev) => ({ ...initialForm, requesterName: prev.requesterName || currentUser?.fullName || '' }));
      await loadDoubts();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-card doubt-layout">
      <div>
        <p className="label">Next Feature</p>
        <h1>Post a new doubt</h1>
        <p className="subtitle">Students and experts can post doubts. Students can assign experts and initiate chat requests.</p>

        <form className="profile-form" onSubmit={onSubmit}>
          <p className="muted">Posting as: {currentUser?.fullName || form.requesterName || 'User'}</p>
          <label>
            Doubt Title
            <input name="title" value={form.title} onChange={onChange} required />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={onChange}>
              <option>Development</option>
              <option>Data Science</option>
              <option>Cloud</option>
              <option>Business</option>
            </select>
          </label>
          <label>
            Description
            <textarea name="description" value={form.description} onChange={onChange} rows="5" required />
          </label>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post Doubt'}
          </button>
        </form>

        {error ? <p className="error-box">{error}</p> : null}
        {success ? <p className="success-box">{success}</p> : null}
      </div>

      <div>
        <p className="label">Recent Doubts</p>
        {loading ? <p className="muted">Loading doubts...</p> : null}
        <div className="doubt-list">
          {doubts.map((doubt) => (
            <article key={doubt.id} className="doubt-card">
              <div className="directory-topline">
                <span className="status-badge open">{doubt.status}</span>
                <span className="mini-id">{doubt.category}</span>
              </div>
              <h3>{doubt.title}</h3>
              <p className="muted">{doubt.description}</p>
              <div className="meta-row">
                <strong>{doubt.requesterName}</strong>
                <span>{doubt.createdAtLabel}</span>
              </div>

              <button
                type="button"
                className="secondary-btn stretch-btn"
                onClick={async () => {
                  setMatchState({ doubtId: doubt.id, loading: true, error: '', data: null });
                  try {
                    const data = await fetchDoubtMatches(doubt.id);
                    setMatchState({ doubtId: doubt.id, loading: false, error: '', data });
                  } catch (matchError) {
                    setMatchState({ doubtId: doubt.id, loading: false, error: matchError.message, data: null });
                  }
                }}
              >
                Match Experts
              </button>

              {matchState.doubtId === doubt.id && matchState.loading ? (
                <p className="muted">Finding best experts...</p>
              ) : null}

              {matchState.doubtId === doubt.id && matchState.error ? (
                <p className="error-box">{matchState.error}</p>
              ) : null}

              {matchState.doubtId === doubt.id && matchState.data ? (
                <div className="match-box">
                  <p className="label">Matched Keywords</p>
                  <div className="chips compact">
                    {matchState.data.keywords.map((keyword) => (
                      <span key={keyword}>{keyword}</span>
                    ))}
                  </div>

                  <div className="match-list">
                    {matchState.data.matches.length ? (
                      matchState.data.matches.map((expert) => (
                        <div key={expert.id} className="match-item">
                          <div>
                            <strong>{expert.fullName}</strong>
                            <p className="muted">{expert.specialties.slice(0, 3).join(', ') || 'No skills listed'}</p>
                            <p className="muted">Status: {expert.availabilityStatus || 'offline'}</p>
                          </div>
                          <div className="match-actions">
                            <span className="mini-id">Score {expert.matchScore}</span>
                            {currentUser?.role === 'student' ? (
                              <button
                                type="button"
                                className="secondary-btn"
                                disabled={String(expert.availabilityStatus || '').toLowerCase() !== 'available'}
                                onClick={async () => {
                                  try {
                                    setError('');
                                    await assignExpertToDoubt(doubt.id, expert.id);
                                    setSuccess(`Assigned ${expert.fullName} to doubt #${doubt.id}.`);
                                    await loadDoubts();
                                  } catch (assignError) {
                                    setError(assignError.message);
                                  }
                                }}
                              >
                                {String(expert.availabilityStatus || '').toLowerCase() === 'available'
                                  ? 'Assign Expert'
                                  : 'Unavailable'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="muted">No matching experts found for this doubt.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {doubt.assignedExpert && currentUser?.role === 'student' ? (
                <div className="assigned-strip">
                  <p className="success-box">
                    Assigned to {doubt.assignedExpert.fullName} ({doubt.assignedExpert.title || 'Expert'})
                  </p>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={async () => {
                      try {
                        const session = await createSession({ doubtId: doubt.id, expertId: doubt.assignedExpert.id });
                        if (session?._meta?.created || String(session?.status || '').toLowerCase() === 'requested') {
                          setSuccess(`Chat request sent to ${doubt.assignedExpert.fullName}. Waiting for expert confirmation.`);
                        } else {
                          setSuccess(`Opened existing session #${session.id} for doubt #${doubt.id}.`);
                        }
                        if (onOpenSession) onOpenSession(session);
                      } catch (sessionError) {
                        setError(sessionError.message);
                      }
                    }}
                  >
                    Start Chat Request
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DoubtBoardPage;
