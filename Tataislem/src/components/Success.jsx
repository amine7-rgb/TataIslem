import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { successToast } from '../utils/toast';

export default function Success() {
  useEffect(() => {
    successToast('Payment confirmed');
  }, []);

  return (
    <div className="status-shell">
      <div className="status-card success">
        <p className="auth-eyebrow">Stripe Checkout</p>
        <h1>Payment successful</h1>
        <p>
          Your payment has been confirmed. We are preparing your confirmation email and
          related documents.
        </p>
        <div className="status-actions">
          <Link to="/dashboard" className="book-btn">
            Open Dashboard
          </Link>
          <Link to="/" className="details-btn">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
