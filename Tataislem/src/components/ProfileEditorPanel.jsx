import { useRef, useState } from 'react';
import { FiCamera, FiCheckCircle, FiShield, FiTrash2 } from 'react-icons/fi';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import UserAvatar from './UserAvatar';
import { prepareAvatarDataUrl } from '../utils/avatar';
import { errorToast } from '../utils/toast';

export default function ProfileEditorPanel({
  user,
  formData,
  setFormData,
  onSubmit,
  saving,
  submitLabel = 'Save Changes',
}) {
  const fileInputRef = useRef(null);
  const [processingAvatar, setProcessingAvatar] = useState(false);

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setProcessingAvatar(true);

    try {
      const avatarUrl = await prepareAvatarDataUrl(file);
      setFormData((current) => ({ ...current, avatarUrl }));
    } catch (error) {
      errorToast(error.message);
    } finally {
      setProcessingAvatar(false);
      event.target.value = '';
    }
  };

  return (
    <div className="dashboard-card dashboard-card-profile">
      <div className="dashboard-card-header">
        <div>
          <p className="dashboard-section-label">Profile Settings</p>
          <h2>Keep your account details up to date</h2>
        </div>
      </div>

      <div className="profile-editor">
        <div className="profile-editor-summary">
          <UserAvatar src={formData.avatarUrl} name={user?.fullName} size="xl" />
          <div className="profile-editor-identity">
            <strong>{user?.fullName}</strong>
            <span
              className={`profile-editor-verified-badge ${
                user?.emailVerified ? 'is-verified' : 'is-pending'
              }`}
            >
              <FiCheckCircle />
              <span>
                {user?.emailVerified ? 'Verified account' : 'Verification pending'}
              </span>
            </span>
          </div>

          <div className="profile-editor-meta-list">
            <div className="profile-editor-meta">
              <FiShield />
              <span>
                {user?.role === 'admin'
                  ? 'Administrator account'
                  : 'Verified client profile'}
              </span>
            </div>
          </div>

          <div className="profile-editor-avatar-actions">
            <button
              type="button"
              className="dashboard-secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingAvatar}
            >
              <FiCamera />
              {processingAvatar ? 'Preparing image...' : 'Upload Photo'}
            </button>

            {formData.avatarUrl ? (
              <button
                type="button"
                className="dashboard-text-button dashboard-text-button--danger"
                onClick={() =>
                  setFormData((current) => ({
                    ...current,
                    avatarUrl: null,
                  }))
                }
              >
                <FiTrash2 />
                Remove photo
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="profile-editor-file-input"
            onChange={handleAvatarPick}
          />
        </div>

        <form className="dashboard-form profile-editor-form" onSubmit={onSubmit}>
          <div className="auth-grid-two">
            <label className="dashboard-field">
              <span>First name</span>
              <input
                type="text"
                value={formData.firstName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                placeholder="First name"
                required
              />
            </label>

            <label className="dashboard-field">
              <span>Last name</span>
              <input
                type="text"
                value={formData.lastName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                placeholder="Last name"
                required
              />
            </label>
          </div>

          <label className="dashboard-field">
            <span>Email</span>
            <input type="email" value={user?.email || ''} disabled />
          </label>

          <div className="dashboard-field">
            <span>Phone number</span>
            <PhoneInput
              country="tn"
              preferredCountries={['tn', 'fr', 'dz', 'ma', 'ae']}
              value={formData.phoneNumber}
              onChange={(value) =>
                setFormData((current) => ({ ...current, phoneNumber: value }))
              }
              enableSearch
              countryCodeEditable={false}
              inputProps={{ required: true, name: 'phoneNumber' }}
              containerClass="phone-input-container"
              inputClass="phone-input-field"
              buttonClass="phone-input-button"
              dropdownClass="phone-input-dropdown"
              searchClass="phone-search-field"
            />
          </div>

          <label className="dashboard-field">
            <span>Address</span>
            <textarea
              rows="4"
              value={formData.address}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              placeholder="Street, city, region"
              required
            />
          </label>

          <button
            type="submit"
            className="auth-submit"
            disabled={saving || processingAvatar}
          >
            {saving ? 'Saving changes...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
