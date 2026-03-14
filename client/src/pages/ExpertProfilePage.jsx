import { useState } from 'react';
import { createExpertProfile } from '../services/expertApi.js';

const initialForm = {
  fullName: '',
  skills: '',
  pricePerMinute: '',
  availabilityStatus: 'available'
};

function ExpertProfilePage({ onExploreExperts }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdProfile, setCreatedProfile] = useState(null);

  function onFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: form.fullName,
        skills: form.skills,
        pricePerMinute: Number(form.pricePerMinute),
        availabilityStatus: form.availabilityStatus
      };

      const created = await createExpertProfile(payload);
      setCreatedProfile(created);
      setSuccess('Expert profile created and saved to database successfully.');
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="screen form-layout">
      <section className="form-card">
        <p className="label">Create Expert Profile</p>
        <h1>Fill skills, price, and availability</h1>
        <p className="subtitle">
          This form calls the backend API and stores profile data in MySQL for the expert directory.
        </p>

        <form onSubmit={onSubmit} className="profile-form">
          <label>
            Full Name
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={onFieldChange}
              placeholder="e.g. Dr. Aris Thorne"
              required
            />
          </label>

          <label>
            Skills (comma separated)
            <input
              type="text"
              name="skills"
              value={form.skills}
              onChange={onFieldChange}
              placeholder="Cloud Architecture, AWS, Kubernetes"
              required
            />
          </label>

          <label>
            Price per minute
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="pricePerMinute"
              value={form.pricePerMinute}
              onChange={onFieldChange}
              placeholder="2.50"
              required
            />
          </label>

          <label>
            Availability
            <select name="availabilityStatus" value={form.availabilityStatus} onChange={onFieldChange}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </label>

          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Create Profile'}
          </button>
        </form>

        {error ? <p className="error-box">{error}</p> : null}
        {success ? <p className="success-box">{success}</p> : null}

        <button type="button" className="secondary-btn stretch-btn" onClick={onExploreExperts}>
          View All Developers
        </button>
      </section>

      <section className="preview-card">
        <p className="label">Saved Profile Preview</p>
        {!createdProfile ? (
          <p className="muted">No profile created in this session yet.</p>
        ) : (
          <>
            <h2>{createdProfile.fullName}</h2>
            <p className="title">
              {createdProfile.availabilityStatus} | ${createdProfile.pricePerMinute}/min
            </p>
            <div className="chips">
              {createdProfile.specialties.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <p className="muted">User ID: {createdProfile.userId}</p>
            <p className="muted">Slug: {createdProfile.slug}</p>
          </>
        )}
      </section>
    </main>
  );
}

export default ExpertProfilePage;
