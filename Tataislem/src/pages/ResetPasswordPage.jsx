import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { errorToast, successToast } from '../utils/toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();

  const token = String(searchParams.get('token') || '').trim();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(token ? 'idle' : 'error');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState(
    token
      ? 'Choose a new password for your Tata Islem account.'
      : 'This reset link is missing or incomplete.',
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      errorToast('Reset token is missing');
      return;
    }

    if (password !== confirmPassword) {
      errorToast('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const data = await resetPassword({ token, password });
      setStatus('success');
      setMessage(data.message || 'Password updated successfully.');
      successToast('Your password has been updated');
      setTimeout(() => {
        navigate('/auth?mode=login', { replace: true });
      }, 1400);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
      errorToast(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell auth-shell--premium">
      <div className="auth-backdrop"></div>
      <div className="auth-orb auth-orb-left"></div>
      <div className="auth-orb auth-orb-right"></div>

      <div className="auth-card auth-card--reset">
        <div className="auth-copy">
          <div className="auth-brand-row">
            <Link to="/" className="auth-home-link">
              Tata Islem
            </Link>
            <span className="auth-brand-tag">Secure account recovery</span>
          </div>

          <p className="auth-eyebrow">Password Reset</p>
          <h1>Protect your account and get back to your dashboard.</h1>
          <p>
            Choose a strong new password to restore access to your reservations, service
            history, invoices, and reminder emails without losing any booking data.
          </p>

          <div className="auth-metrics">
            <div className="auth-metric-card">
              <span className="auth-metric-dot"></span>
              <p>Reset links expire automatically for added protection</p>
            </div>
            <div className="auth-metric-card">
              <span className="auth-metric-dot"></span>
              <p>Older sessions are signed out once the password changes</p>
            </div>
            <div className="auth-metric-card">
              <span className="auth-metric-dot"></span>
              <p>Your bookings, tickets, and invoices stay attached to the account</p>
            </div>
          </div>
        </div>

        <div className="auth-form-panel auth-form-panel--premium">
          <div className="auth-panel-header">
            <span className="auth-panel-eyebrow">Set New Password</span>
            <h2>Choose your new credentials</h2>
            <p>{message}</p>
          </div>

          <form className="auth-form auth-form--rich" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>New password</span>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 12 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={!token || status === 'success'}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={!token || status === 'success'}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <div className="auth-password-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  disabled={!token || status === 'success'}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  disabled={!token || status === 'success'}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </label>

            <p className="auth-password-hint">
              Use at least 12 characters including uppercase, lowercase, a number, and a
              symbol.
            </p>

            {status === 'error' ? (
              <div className="auth-inline-note auth-inline-note--warning">
                <strong>Reset link issue.</strong>
                <p>
                  This link may have expired or already been used. Request a new reset
                  email from the login page if needed.
                </p>
              </div>
            ) : null}

            {status === 'success' ? (
              <div className="auth-inline-note auth-inline-note--success">
                <strong>Password updated.</strong>
                <p>Redirecting you to the login page now.</p>
              </div>
            ) : null}

            <button
              type="submit"
              className="auth-submit"
              disabled={!token || submitting || status === 'success'}
            >
              {submitting ? 'Updating your password...' : 'Save New Password'}
            </button>

            <div className="auth-secondary-actions">
              <Link to="/auth?mode=login" className="auth-link-button auth-link-anchor">
                Back to login
              </Link>
              <Link to="/" className="auth-link-button auth-link-anchor">
                Back to home
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
