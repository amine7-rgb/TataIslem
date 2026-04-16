import { useNavigate } from 'react-router-dom';

export default function AuthGateModal({
  open,
  onClose,
  title = 'Sign in to continue',
  description = 'Create your account or log in to access reservations and premium services.',
}) {
  const navigate = useNavigate();

  if (!open) {
    return null;
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const handleRedirect = (mode) => {
    navigate(`/auth?mode=${mode}&returnTo=${encodeURIComponent(currentPath)}`);
    onClose?.();
  };

  const handleOverlayKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose?.();
    }
  };

  return (
    <div
      className="auth-gate-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="auth-gate-card" role="dialog" aria-modal="true">
        <button type="button" className="auth-gate-close" onClick={onClose}>
          ×
        </button>

        <p className="auth-gate-eyebrow">Members Only</p>
        <h3>{title}</h3>
        <p>{description}</p>

        <div className="auth-gate-actions">
          <button
            type="button"
            className="book-btn"
            onClick={() => handleRedirect('login')}
          >
            Log In
          </button>
          <button
            type="button"
            className="details-btn"
            onClick={() => handleRedirect('register')}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
