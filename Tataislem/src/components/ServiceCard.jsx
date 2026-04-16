import React, { memo, useState } from 'react';
import axios from 'axios';
import image1 from '../assets/images/relationship.webp';
import image2 from '../assets/images/business.png';
import image3 from '../assets/images/development.png';
import image4 from '../assets/images/leadership.png';
import { useAuth } from '../hooks/useAuth';
import { getImageUrl } from '../utils/media';
import { errorToast } from '../utils/toast';
import AuthGateModal from './AuthGateModal';

const fallbackImages = [image1, image2, image3, image4];

const serviceImagesMap = {
  '/images/relationship.webp': image1,
  '/images/business.png': image2,
  '/images/development.png': image3,
  '/images/leadership.png': image4,
};

const buildDefaultMeetingValue = () => {
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(10, 0, 0, 0);

  const timezoneOffset = nextDay.getTimezoneOffset() * 60000;
  return new Date(nextDay.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const resolveServiceImage = (service, index) => {
  const fallback = fallbackImages[index % fallbackImages.length];

  if (!service.image || typeof service.image !== 'string') {
    return fallback;
  }

  const path = service.image.trim();

  if (!path) {
    return fallback;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (serviceImagesMap[path]) {
    return serviceImagesMap[path];
  }

  return getImageUrl(path);
};

const ServiceCard = memo(function ServiceCard({ service, index }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestedStartAt, setRequestedStartAt] = useState(buildDefaultMeetingValue());
  const [imageSrc, setImageSrc] = useState(() => resolveServiceImage(service, index));
  const { user } = useAuth();

  const handleBookingAccess = () => {
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    setRequestedStartAt((currentValue) => currentValue || buildDefaultMeetingValue());
    setShowBooking(true);
  };

  const handleCheckout = async () => {
    try {
      if (!requestedStartAt) {
        throw new Error('Please choose your preferred meeting date and time');
      }

      const requestedDate = new Date(requestedStartAt);

      if (Number.isNaN(requestedDate.getTime())) {
        throw new Error('Please choose a valid meeting date and time');
      }

      setLoading(true);

      const { data } = await axios.post('/api/services/checkout', {
        serviceId: service._id,
        requestedStartAt: requestedDate.toISOString(),
      });

      if (!data?.url) {
        throw new Error('Payment link not received');
      }

      window.location.href = data.url;
    } catch (err) {
      errorToast(
        err?.response?.data?.error ||
          err?.response?.data?.errors?.[0] ||
          err?.message ||
          'Payment error. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="services-card-new">
        <div className="services-image-new">
          <img
            src={imageSrc}
            alt={service.title}
            onError={() => setImageSrc(fallbackImages[index % fallbackImages.length])}
          />
        </div>

        <div className="services-body-new">
          <h4>{service.title}</h4>
          <p>{service.shortDesc}</p>

          <div className="services-buttons">
            <button
              type="button"
              className="details-btn"
              onClick={() => setShowDetails(true)}
            >
              View Details
            </button>

            <button type="button" className="book-btn" onClick={handleBookingAccess}>
              Book
            </button>
          </div>
        </div>
      </div>

      {showDetails ? (
        <div
          className="services-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetails(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowDetails(false);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="services-modal-content" role="dialog" aria-modal="true">
            <h3>{service.title}</h3>
            <p>{service.fullDesc}</p>

            <div className="price-box">
              <span className="price-label">Investment</span>
              <div className="price-value">EUR {service.price?.toLocaleString()}</div>
            </div>

            <button
              type="button"
              className="modal-close-btn details-closee"
              onClick={() => setShowDetails(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showBooking && user ? (
        <div
          className="services-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowBooking(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowBooking(false);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="services-modal-content" role="dialog" aria-modal="true">
            <h3>Book {service.title}</h3>

            <div className="account-summary-card compact">
              <div>
                <span>Account</span>
                <strong>{user.fullName}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{user.phoneNumber}</strong>
              </div>
              <div>
                <span>Address</span>
                <strong>{user.address}</strong>
              </div>
            </div>

            <div className="price-box">
              <span className="price-label">Secure Stripe Checkout</span>
              <div className="price-value">EUR {service.price?.toLocaleString()}</div>
            </div>

            <label className="dashboard-field service-booking-field">
              <span>Preferred meeting date and time</span>
              <input
                type="datetime-local"
                value={requestedStartAt}
                min={buildDefaultMeetingValue()}
                onChange={(event) => setRequestedStartAt(event.target.value)}
              />
            </label>

            <p className="booking-note">
              Your booking will use your verified profile information. After payment, the
              admin will either confirm this slot or send you other available dates in
              your dashboard calendar.
            </p>

            <div className="modal-actions">
              <button type="button" onClick={handleCheckout} disabled={loading}>
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowBooking(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Sign in before booking this service"
        description="Services now require a verified account so your payments, invoices, and follow-up are tied to the right client profile."
      />
    </>
  );
});

ServiceCard.displayName = 'ServiceCard';

export default ServiceCard;
