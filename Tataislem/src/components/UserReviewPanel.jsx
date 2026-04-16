import { useEffect, useMemo, useState } from 'react';
import { FiMessageSquare, FiStar } from 'react-icons/fi';
import fallbackAvatarA from '../assets/images/user2.jpg';
import fallbackAvatarB from '../assets/images/user3.png';
import { requestJson } from '../utils/api';
import { errorToast, successToast } from '../utils/toast';

const fallbackAvatars = [fallbackAvatarA, fallbackAvatarB];

const buildInitialForm = (review) => ({
  headline: review?.headline || '',
  text: review?.text || '',
  rating: Number(review?.rating) || 5,
});

const formatReviewDate = (value) => {
  if (!value) {
    return 'Not published yet';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export default function UserReviewPanel({ user, currentReview, onReviewSaved }) {
  const [formData, setFormData] = useState(() => buildInitialForm(currentReview));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(buildInitialForm(currentReview));
  }, [currentReview]);

  const previewAvatar = useMemo(
    () => user?.avatarUrl || fallbackAvatars[0],
    [user?.avatarUrl],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await requestJson('/api/account/review', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      successToast(response.message || 'Your review has been saved');

      if (typeof onReviewSaved === 'function') {
        await onReviewSaved(response.review);
      }
    } catch (error) {
      errorToast(error.message || 'Unable to save your review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-review-stack dashboard-review-stack--user">
      <section className="dashboard-card dashboard-review-intro">
        <div className="dashboard-review-intro-copy">
          <p className="dashboard-section-label">Public Testimonial</p>
          <h2>Share a clear testimonial that reflects your experience.</h2>
          <p>
            Publish one testimonial from your verified client account and update it
            whenever your experience evolves.
          </p>
        </div>

        <div className="dashboard-review-intro-pills">
          <span className="dashboard-review-intro-pill">
            <FiMessageSquare />
            One testimonial per account
          </span>
          <span className="dashboard-review-intro-pill">
            Visible on the website after publishing
          </span>
        </div>
      </section>

      <div className="dashboard-review-grid">
        <section className="dashboard-card dashboard-review-form-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-section-label">Testimonial Form</p>
              <h2>Write a concise and credible testimonial</h2>
            </div>
            <span className="dashboard-card-pill">Ready to publish</span>
          </div>

          <form className="dashboard-form dashboard-review-form" onSubmit={handleSubmit}>
            <div className="dashboard-review-form-row">
              <label className="dashboard-field">
                <span>Headline</span>
                <input
                  type="text"
                  maxLength="90"
                  value={formData.headline}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      headline: event.target.value,
                    }))
                  }
                  placeholder="The session helped me move forward with clarity."
                />
              </label>

              <div className="dashboard-field">
                <span>Rating</span>
                <div
                  className="dashboard-rating-picker"
                  role="radiogroup"
                  aria-label="Review rating"
                >
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const active = value <= formData.rating;

                    return (
                      <button
                        key={value}
                        type="button"
                        className={`dashboard-rating-star ${active ? 'is-active' : ''}`}
                        onClick={() =>
                          setFormData((current) => ({
                            ...current,
                            rating: value,
                          }))
                        }
                        aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      >
                        <FiStar />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <label className="dashboard-field">
              <span>Review</span>
              <textarea
                rows="4"
                maxLength="600"
                value={formData.text}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, text: event.target.value }))
                }
                placeholder="Describe the support you received, what changed for you, and the result you experienced."
                required
              />
              <small className="dashboard-input-note">
                Minimum 20 characters. Write naturally, stay specific, and keep it
                authentic.
              </small>
            </label>

            <div className="dashboard-review-form-foot">
              <small className="dashboard-review-character-count">
                {formData.text.length}/600
              </small>
            </div>

            <button type="submit" className="auth-submit" disabled={saving}>
              {saving
                ? 'Saving testimonial...'
                : currentReview
                  ? 'Update Testimonial'
                  : 'Publish Testimonial'}
            </button>
          </form>
        </section>

        <section className="dashboard-card dashboard-review-preview-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-section-label">Website Preview</p>
              <h2>Preview your testimonial before it goes live</h2>
            </div>
          </div>

          <article className="dashboard-review-preview-card-inner">
            <div className="dashboard-review-preview-orb" />

            <div className="dashboard-review-preview-copy">
              {formData.headline ? (
                <p className="dashboard-review-preview-headline">{formData.headline}</p>
              ) : null}
              <p className="dashboard-review-preview-text">
                {formData.text ||
                  'Your testimonial preview will appear here as soon as you start writing.'}
              </p>
            </div>

            <div className="dashboard-review-preview-person">
              <div className="dashboard-review-preview-avatar">
                <img src={previewAvatar} alt={user?.fullName || 'Client avatar'} />
              </div>

              <div className="dashboard-review-preview-meta">
                <p className="dashboard-review-preview-name">
                  {user?.fullName || 'Verified client'}
                </p>
                <div
                  className="dashboard-review-preview-stars"
                  aria-label={`${formData.rating} star review`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      key={`preview-star-${index + 1}`}
                      className={`dashboard-review-preview-star ${
                        index < formData.rating ? 'is-active' : ''
                      }`}
                    >
                      &#9733;
                    </span>
                  ))}
                </div>
                <small className="dashboard-review-date">
                  Last updated: {formatReviewDate(currentReview?.updatedAt)}
                </small>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
