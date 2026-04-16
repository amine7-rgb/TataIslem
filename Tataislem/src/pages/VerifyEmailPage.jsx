import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { requestJson } from '../utils/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token ? 'Verifying your email...' : 'Verification token is missing.',
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    requestJson(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.message);
      });
  }, [token]);

  return (
    <div className="status-shell">
      <div className={`status-card ${status}`}>
        <p className="auth-eyebrow">Email Verification</p>
        <h1>{status === 'success' ? 'Account activated' : 'Verification status'}</h1>
        <p>{message}</p>
        <div className="status-actions">
          <Link to="/auth?mode=login" className="book-btn">
            Go to Login
          </Link>
          <Link to="/" className="details-btn">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
