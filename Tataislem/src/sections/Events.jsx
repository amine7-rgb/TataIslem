import { useEffect, useMemo, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import 'react-phone-input-2/lib/style.css';
import AuthGateModal from '../components/AuthGateModal';
import { useAuth } from '../hooks/useAuth';
import { requestJson } from '../utils/api';
import { getImageUrl } from '../utils/media';
import { errorToast } from '../utils/toast';

const EVENTS_PER_PAGE = 6;

const buildVisiblePages = (currentPage, totalPages) => {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const pages = new Set([1, safeTotal, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= safeTotal)
    .sort((left, right) => left - right);
};

export default function Events() {
  const recaptchaRef = useRef(null);
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const recaptchaEnabled =
    (import.meta.env.VITE_RECAPTCHA_ENABLED
      ? import.meta.env.VITE_RECAPTCHA_ENABLED === 'true'
      : import.meta.env.PROD) && Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY);

  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [gender, setGender] = useState('male');

  useEffect(() => {
    let ignore = false;

    const loadEvents = async () => {
      setLoadingEvents(true);

      try {
        const data = await requestJson(
          `/api/events?page=${currentPage}&limit=${EVENTS_PER_PAGE}&filter=${filter}`,
        );

        if (ignore) {
          return;
        }

        setEvents(data.items || []);
        setPagination(
          data.pagination || {
            page: currentPage,
            totalPages: 1,
            totalItems: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        );
      } catch (error) {
        if (!ignore) {
          errorToast(error.message || 'Failed to load events');
        }
      } finally {
        if (!ignore) {
          setLoadingEvents(false);
        }
      }
    };

    loadEvents();

    return () => {
      ignore = true;
    };
  }, [currentPage, filter]);

  const visiblePages = useMemo(
    () => buildVisiblePages(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  const isEventExpired = (eventDate) => new Date(eventDate) < new Date();

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    };
  };

  const getDaysLeft = (dateStr) => {
    const currentDate = new Date();
    const eventDate = new Date(dateStr);
    const diffTime = eventDate - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleBookingAccess = (event) => {
    setSelectedEvent(event);

    if (!user) {
      setShowAuthGate(true);
      return;
    }

    setGender('male');
    setShowBookingModal(true);
  };

  const handleDetailsOpen = (event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      let token = null;

      if (recaptchaEnabled) {
        if (!recaptchaRef.current) {
          throw new Error('reCAPTCHA not ready');
        }

        token = await recaptchaRef.current.executeAsync();
        recaptchaRef.current.reset();
      }

      const response = await fetch('/api/reservations/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender,
          eventId: selectedEvent._id,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || data?.errors?.[0] || 'Payment initialization failed',
        );
      }

      window.location.href = data.url;
    } catch (error) {
      errorToast(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="events" className="events-section">
      <div className="container">
        <h2 className="section-title">Our Events</h2>

        <div className="filter-bar">
          <button
            type="button"
            onClick={() => handleFilterChange('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('new')}
            className={filter === 'new' ? 'active' : ''}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('old')}
            className={filter === 'old' ? 'active' : ''}
          >
            Old
          </button>
        </div>

        <div className="row">
          {loadingEvents ? (
            <div className="events-empty-state">
              <p>Loading the latest events...</p>
            </div>
          ) : events.length ? (
            events.map((event) => {
              const isNew = new Date(event.date) >= today;
              const { day, month } = formatEventDate(event.date);

              return (
                <div key={event._id} className="col-md-4 col-sm-6 col-xs-12">
                  <div className="card">
                    {isNew && <span className="new-sticker">New</span>}

                    <div
                      className="cover"
                      style={{ backgroundImage: `url(${getImageUrl(event.image)})` }}
                    >
                      <div className="date-badge">
                        <span className="month">{month}</span>
                        <span className="day">{day}</span>
                        <span className="divider" />
                        <span className="month">DAYS</span>
                        <span className="day">- {getDaysLeft(event.date)}</span>
                      </div>

                      <div className="event-mini-card">
                        <h3>{event.title}</h3>
                        <p>{event.availableSeats} seats left</p>
                        <span className="swipe">Swipe -&gt;</span>
                      </div>
                    </div>

                    <div className="card-back">
                      {!isEventExpired(event.date) && (
                        <button
                          type="button"
                          className="modal-button"
                          onClick={() => handleBookingAccess(event)}
                        >
                          Book Your Seat
                        </button>
                      )}

                      <button
                        type="button"
                        className="modal-button"
                        onClick={() => handleDetailsOpen(event)}
                      >
                        More Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="events-empty-state">
              <p>No events match this selection yet.</p>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 ? (
          <div className="pagination-wrapper">
            <button
              type="button"
              className="page-btn"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={!pagination.hasPreviousPage}
            >
              {'<'}
            </button>

            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                className={`page-btn ${page === pagination.page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="page-btn"
              onClick={() =>
                setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))
              }
              disabled={!pagination.hasNextPage}
            >
              {'>'}
            </button>
          </div>
        ) : null}
      </div>

      {showBookingModal && selectedEvent && user ? (
        <div
          className="modal-overlay active"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowBookingModal(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowBookingModal(false);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-left">
              <img
                src={getImageUrl(selectedEvent.image)}
                alt={selectedEvent.title}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/assets/images/default.jpg';
                }}
              />
            </div>

            <div className="modal-right">
              <button
                type="button"
                className="details-close"
                onClick={() => setShowBookingModal(false)}
              >
                x
              </button>

              <h2>Book Your Seat</h2>
              <p>
                <strong>{selectedEvent.title}</strong>
              </p>

              <div className="account-summary-card">
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
              </div>

              <form onSubmit={handleSubmit}>
                <div className="gender-radio">
                  <input
                    type="radio"
                    id="male"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(event) => setGender(event.target.value)}
                  />
                  <label htmlFor="male">Male</label>

                  <input
                    type="radio"
                    id="female"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(event) => setGender(event.target.value)}
                  />
                  <label htmlFor="female">Female</label>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? 'Redirecting...' : 'Pay with Stripe'}
                </button>

                {recaptchaEnabled ? (
                  <ReCAPTCHA
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    size="invisible"
                    ref={recaptchaRef}
                  />
                ) : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {showDetailsModal && selectedEvent ? (
        <div
          className="modal-overlay active"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetailsModal(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowDetailsModal(false);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="modal-content details-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="details-close"
              onClick={() => setShowDetailsModal(false)}
            >
              x
            </button>

            <div className="details-header">
              <img
                src={getImageUrl(selectedEvent.image)}
                alt={selectedEvent.title}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/assets/images/default.jpg';
                }}
              />
            </div>

            <div className="details-body grid-layout">
              <div className="details-map">
                <iframe
                  title="event-location"
                  src={`https://maps.google.com/maps?q=${selectedEvent.location.coordinates[1]},${selectedEvent.location.coordinates[0]}&z=14&output=embed`}
                  loading="lazy"
                />
              </div>

              <div className="details-info">
                <h2>{selectedEvent.title}</h2>

                <div className="details-meta">
                  <span>Date: {new Date(selectedEvent.date).toLocaleString()}</span>
                  <span>Seats: {selectedEvent.availableSeats} seats left</span>
                  <span>Price: {selectedEvent.price} EUR</span>
                </div>

                <p className="event-location">Location: {selectedEvent.address}</p>

                <p className="details-desc">
                  Join us for an unforgettable experience. Book now and enjoy premium
                  access to this exclusive event.
                </p>

                <div className="details-actions">
                  <a
                    href={`https://www.google.com/maps?q=${selectedEvent.location.coordinates[1]},${selectedEvent.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="book-btn"
                  >
                    Open in Google Maps
                  </a>

                  {!isEventExpired(selectedEvent.date) ? (
                    <button
                      type="button"
                      className="book-btn"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleBookingAccess(selectedEvent);
                      }}
                    >
                      Book Your Seat
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Sign in before booking this event"
        description="Reservations are now linked to a verified account for better security, confirmations, and dashboard tracking."
      />
    </section>
  );
}
