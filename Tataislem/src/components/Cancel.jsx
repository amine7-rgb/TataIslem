import { Link } from 'react-router-dom';

export default function Cancel() {
  return (
    <div className="status-shell">
      <div className="status-card error">
        <p className="auth-eyebrow">Stripe Checkout</p>
        <h1>Payment cancelled</h1>
        <p>Your payment was cancelled. You can come back at any time and try again.</p>
        <div className="status-actions">
          <Link to="/" className="book-btn">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
