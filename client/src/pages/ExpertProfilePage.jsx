import { useEffect, useState } from 'react';
import {
  createExpertProfile,
  fetchMyExpertProfile,
  updateMyExpertAvailability,
  uploadMyExpertAvatar
} from '../services/expertApi.js';
import { uploadMyAvatar } from '../services/authApi.js';

const initialForm = {
  fullName: '',
  skills: '',
  pricePerMinute: '',
  availabilityStatus: 'available'
};

function ExpertProfilePage({ onExploreExperts, currentUser, onProfileCreated }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdProfile, setCreatedProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [studentAvatarUrl, setStudentAvatarUrl] = useState('');

  const fallbackAvatar =
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80';

  useEffect(() => {
    setStudentAvatarUrl(String(currentUser?.profileImageUrl || '').trim());
  }, [currentUser?.profileImageUrl]);

  useEffect(() => {
    if (currentUser?.fullName) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || currentUser.fullName
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== 'expert') {
      setLoadingProfile(false);
      return;
    }

    let active = true;

    async function loadMyProfile() {
      try {
        const profile = await fetchMyExpertProfile();
        if (!active) return;
        setCreatedProfile(profile);
      } catch (_error) {
        if (!active) return;
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    loadMyProfile();

    return () => {
      active = false;
    };
  }, [currentUser?.role]);

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
        availabilityStatus: form.availabilityStatus,
        profileImageUrl: String(currentUser?.profileImageUrl || '').trim()
      };

      const created = await createExpertProfile(payload);
      setCreatedProfile(created);
      setSuccess('Expert profile created and saved to database successfully.');
      setForm((prev) => ({ ...initialForm, fullName: prev.fullName || currentUser?.fullName || '' }));
      if (onProfileCreated) onProfileCreated(created);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onUploadStudentAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAvatarUploading(true);
      setError('');
      setSuccess('');
      const updated = await uploadMyAvatar(file);
      setStudentAvatarUrl(updated.profileImageUrl || '');
      setSuccess('Profile image uploaded successfully.');
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  }

  async function onUploadExpertAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAvatarUploading(true);
      setError('');
      setSuccess('');
      const updated = await uploadMyExpertAvatar(file);
      setCreatedProfile(updated);
      setSuccess('Expert profile image uploaded successfully.');
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  }

  return (
    <main className="screen form-layout">
      <section className="form-card">
        <p className="label">My Profile</p>
        <h1>{currentUser?.role === 'expert' ? 'Expert profile settings' : 'Account overview'}</h1>
        <p className="subtitle">
          {currentUser?.role === 'expert'
            ? 'Create your expert profile once, and change availability anytime.'
            : 'You are logged in as student. You can post doubts and assign experts from the directory.'}
        </p>

        {currentUser?.role !== 'expert' ? (
          <div className="profile-form">
            <div className="avatar-uploader">
              <img
                src={studentAvatarUrl || fallbackAvatar}
                alt="Student profile"
                className="profile-avatar"
                onError={(event) => {
                  event.currentTarget.src = fallbackAvatar;
                }}
              />
              <label className="link-btn upload-trigger-btn">
                {avatarUploading ? 'Uploading...' : 'Upload Profile Image (Optional)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadStudentAvatar}
                  disabled={avatarUploading}
                  className="file-input-hidden"
                />
              </label>
            </div>
            <p className="muted">Name: {currentUser?.fullName}</p>
            <p className="muted">Email: {currentUser?.email}</p>
            <p className="muted">Role: {currentUser?.role}</p>
            <p className="muted">This data is loaded from your registered account.</p>
            <p className="muted">Use Post Doubts to create doubts and All Developers to assign experts.</p>
          </div>
        ) : null}

        {currentUser?.role === 'expert' && loadingProfile ? <p className="muted">Loading profile...</p> : null}

        {currentUser?.role === 'expert' && !createdProfile ? (
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
        ) : null}

        {currentUser?.role === 'expert' && createdProfile ? (
          <div className="profile-form">
            <p className="muted">Profile already created. You can update your availability anytime.</p>
            <div className="avatar-uploader">
              <img
                src={createdProfile.profileImageUrl || fallbackAvatar}
                alt="Expert profile"
                className="profile-avatar"
                onError={(event) => {
                  event.currentTarget.src = fallbackAvatar;
                }}
              />
              <label className="link-btn upload-trigger-btn">
                {avatarUploading ? 'Uploading...' : 'Upload Profile Image (Optional)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadExpertAvatar}
                  disabled={avatarUploading}
                  className="file-input-hidden"
                />
              </label>
            </div>
            <label>
              Availability
              <select
                value={createdProfile.availabilityStatus}
                onChange={async (event) => {
                  try {
                    setStatusSaving(true);
                    setError('');
                    const updated = await updateMyExpertAvailability(event.target.value);
                    setCreatedProfile(updated);
                    setSuccess('Availability updated successfully.');
                  } catch (statusError) {
                    setError(statusError.message);
                  } finally {
                    setStatusSaving(false);
                  }
                }}
                disabled={statusSaving}
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </label>
          </div>
        ) : null}

        {error ? <p className="error-box">{error}</p> : null}
        {success ? <p className="success-box">{success}</p> : null}

        <button type="button" className="secondary-btn stretch-btn" onClick={onExploreExperts}>
          View All Developers
        </button>
      </section>

      <section className="preview-card">
        <p className="label">Saved Profile Preview</p>
        {currentUser?.role !== 'expert' ? (
          <p className="muted">Student account does not require expert profile.</p>
        ) : !createdProfile ? (
          <p className="muted">No profile created in this session yet.</p>
        ) : (
          <>
            <img
              src={createdProfile.profileImageUrl || fallbackAvatar}
              alt="Expert preview"
              className="profile-avatar preview"
              onError={(event) => {
                event.currentTarget.src = fallbackAvatar;
              }}
            />
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
