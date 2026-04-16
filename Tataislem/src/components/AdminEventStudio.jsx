import { useEffect, useMemo, useState } from 'react';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiImage,
  FiLayers,
  FiMapPin,
  FiRefreshCw,
  FiTag,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { requestJson } from '../utils/api';
import { getImageUrl } from '../utils/media';
import { errorToast, successToast } from '../utils/toast';

const EVENTS_PER_PAGE = 6;

const buildInitialFormData = () => ({
  title: '',
  description: '',
  date: '',
  price: '',
  totalSeats: '',
  address: '',
  latitude: '',
  longitude: '',
  image: '',
});

const dateCardFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
});

const dateLineFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const buildVisiblePages = (currentPage, totalPages) => {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const pages = new Set([1, safeTotal, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= safeTotal)
    .sort((left, right) => left - right);
};

const buildPaginationSequence = (pages) =>
  pages.reduce((sequence, page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      sequence.push(`ellipsis-${pages[index - 1]}-${page}`);
    }

    sequence.push(page);
    return sequence;
  }, []);

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const buildFormDataFromEvent = (event) => ({
  title: event?.title || '',
  description: event?.description || '',
  date: toDateTimeLocalValue(event?.date),
  price: String(event?.price ?? ''),
  totalSeats: String(event?.totalSeats ?? ''),
  address: event?.address || '',
  latitude: String(event?.location?.coordinates?.[1] ?? ''),
  longitude: String(event?.location?.coordinates?.[0] ?? ''),
  image: event?.image || '',
});

const isUpcomingEvent = (dateValue) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(dateValue) >= startOfToday;
};

const requestEventsPage = (page, filter) =>
  requestJson(`/api/events?page=${page}&limit=${EVENTS_PER_PAGE}&filter=${filter}`);

const EVENT_FILTER_OPTIONS = [
  {
    value: 'all',
    label: 'All',
    helper: 'Every published event',
    icon: FiLayers,
  },
  {
    value: 'new',
    label: 'Upcoming',
    helper: 'Future experiences',
    icon: FiCalendar,
  },
  {
    value: 'old',
    label: 'Past',
    helper: 'Archived timeline',
    icon: FiClock,
  },
];

export default function AdminEventStudio({ stats, onEventCreated }) {
  const [formData, setFormData] = useState(buildInitialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsFilter, setEventsFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsData, setEventsData] = useState({
    items: [],
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  });

  useEffect(() => {
    let ignore = false;

    const loadEvents = async () => {
      setLoadingEvents(true);

      try {
        const data = await requestEventsPage(currentPage, eventsFilter);

        if (ignore) {
          return;
        }

        setEventsData({
          items: data.items || [],
          pagination: data.pagination || {
            page: currentPage,
            totalPages: 1,
            totalItems: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        });
      } catch (error) {
        if (!ignore) {
          errorToast(error.message || 'Unable to load events');
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
  }, [currentPage, eventsFilter]);

  const previewImage = useMemo(() => getImageUrl(formData.image), [formData.image]);
  const previewDate = formData.date ? new Date(formData.date) : null;
  const previewDateLabel =
    previewDate && !Number.isNaN(previewDate.getTime())
      ? dateCardFormatter.format(previewDate)
      : 'Date';
  const previewDay = previewDateLabel.slice(0, 2);
  const previewMonth = previewDateLabel.slice(3).toUpperCase();
  const publishedEventsCount = stats?.eventsCount || 0;
  const upcomingEventsCount = stats?.upcomingEventsCount || 0;
  const archivedEventsCount = Math.max(publishedEventsCount - upcomingEventsCount, 0);
  const visiblePages = buildVisiblePages(
    eventsData.pagination.page,
    eventsData.pagination.totalPages,
  );
  const paginationSequence = buildPaginationSequence(visiblePages);
  const isEditing = Boolean(editingEventId);

  const applyEventsData = (data, page) => {
    const resolvedPage = data.pagination?.page || page;
    setEventsData({
      items: data.items || [],
      pagination: data.pagination || {
        page: resolvedPage,
        totalPages: 1,
        totalItems: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
    setCurrentPage(resolvedPage);
  };

  const handleFilterChange = (nextFilter) => {
    setEventsFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    setLoadingEvents(true);

    try {
      const data = await requestEventsPage(currentPage, eventsFilter);
      applyEventsData(data, currentPage);
    } catch (error) {
      errorToast(error.message || 'Unable to load events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const requestUrl = editingEventId ? `/api/events/${editingEventId}` : '/api/events';
      const response = await requestJson(requestUrl, {
        method: editingEventId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          totalSeats: Number(formData.totalSeats),
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          date: new Date(formData.date).toISOString(),
        }),
      });

      successToast(
        response.message ||
          (editingEventId
            ? 'Event updated successfully'
            : 'Event published successfully'),
      );
      setFormData(buildInitialFormData());
      setEditingEventId('');

      const nextFilter = editingEventId ? eventsFilter : 'all';
      const nextPage = editingEventId ? currentPage : 1;
      if (!editingEventId) {
        setEventsFilter('all');
        setCurrentPage(1);
      }

      setLoadingEvents(true);

      const refreshedData = await requestEventsPage(nextPage, nextFilter);
      applyEventsData(refreshedData, nextPage);

      if (typeof onEventCreated === 'function') {
        await onEventCreated();
      }
    } catch (error) {
      errorToast(error.message || 'Unable to publish the event');
    } finally {
      setLoadingEvents(false);
      setSubmitting(false);
    }
  };

  const handleEditEvent = (eventItem) => {
    setEditingEventId(eventItem._id);
    setFormData(buildFormDataFromEvent(eventItem));
  };

  const handleCancelEdit = () => {
    setEditingEventId('');
    setFormData(buildInitialFormData());
  };

  const handleDeleteEvent = async (eventItem) => {
    const shouldDelete = window.confirm(
      `Delete "${eventItem.title}" from the showcase? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await requestJson(`/api/events/${eventItem._id}`, {
        method: 'DELETE',
      });

      successToast(response.message || 'Event deleted successfully');

      if (editingEventId === eventItem._id) {
        handleCancelEdit();
      }

      setLoadingEvents(true);
      const refreshedData = await requestEventsPage(currentPage, eventsFilter);
      applyEventsData(refreshedData, currentPage);

      if (typeof onEventCreated === 'function') {
        await onEventCreated();
      }
    } catch (error) {
      errorToast(error.message || 'Unable to delete the event');
    } finally {
      setLoadingEvents(false);
    }
  };

  return (
    <div className="dashboard-event-stack">
      <section className="dashboard-card dashboard-event-hero">
        <div className="dashboard-event-hero-copy">
          <p className="dashboard-section-label">Event Studio</p>
          <h2>Publish new events from the admin dashboard.</h2>
          <p>
            Add the next showcase experience here and it will flow directly into the
            public events section with the same premium visual treatment.
          </p>
        </div>

        <div className="dashboard-event-hero-stats">
          <article>
            <span>Published</span>
            <strong>{publishedEventsCount}</strong>
          </article>
          <article>
            <span>Upcoming</span>
            <strong>{upcomingEventsCount}</strong>
          </article>
          <article>
            <span>Archived</span>
            <strong>{archivedEventsCount}</strong>
          </article>
        </div>
      </section>

      <div className="dashboard-event-grid">
        <section className="dashboard-card dashboard-event-form-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-section-label">Create Event</p>
              <h2>
                {isEditing
                  ? 'Update the experience details'
                  : 'Set the experience details'}
              </h2>
            </div>
            <span className="dashboard-card-pill">
              {isEditing ? 'Editing live event' : 'Front-ready'}
            </span>
          </div>

          {isEditing ? (
            <div className="dashboard-editor-banner">
              <div>
                <strong>Editing in place</strong>
                <p>Save changes to update the front showcase instantly.</p>
              </div>
              <button
                type="button"
                className="dashboard-text-button dashboard-text-button--danger"
                onClick={handleCancelEdit}
              >
                <FiX />
                <span>Cancel</span>
              </button>
            </div>
          ) : null}

          <form className="dashboard-form dashboard-event-form" onSubmit={handleSubmit}>
            <label className="dashboard-field">
              <span>Event title</span>
              <input
                type="text"
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Masterclass, private session, launch night..."
                required
              />
            </label>

            <label className="dashboard-field">
              <span>Description</span>
              <textarea
                rows="4"
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Write the event promise, the atmosphere, and what makes it worth booking."
                required
              />
            </label>

            <div className="auth-grid-two">
              <label className="dashboard-field">
                <span>Date and time</span>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, date: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="dashboard-field">
                <span>Price (EUR)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="150"
                  required
                />
              </label>
            </div>

            <div className="auth-grid-two">
              <label className="dashboard-field">
                <span>Total seats</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.totalSeats}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      totalSeats: event.target.value,
                    }))
                  }
                  placeholder="30"
                  required
                />
              </label>

              <label className="dashboard-field">
                <span>Poster image path or URL</span>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, image: event.target.value }))
                  }
                  placeholder="/uploads/eventold.png or https://..."
                  required
                />
                <small className="dashboard-input-note">
                  Reuse existing files with paths like `/uploads/eventold.png`.
                </small>
              </label>
            </div>

            <label className="dashboard-field">
              <span>Address</span>
              <textarea
                rows="3"
                value={formData.address}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="Venue address"
                required
              />
            </label>

            <div className="auth-grid-two">
              <label className="dashboard-field">
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      latitude: event.target.value,
                    }))
                  }
                  placeholder="36.8065"
                  required
                />
              </label>

              <label className="dashboard-field">
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      longitude: event.target.value,
                    }))
                  }
                  placeholder="10.1815"
                  required
                />
              </label>
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting
                ? isEditing
                  ? 'Saving changes...'
                  : 'Publishing event...'
                : isEditing
                  ? 'Save Event Changes'
                  : 'Publish Event'}
            </button>
          </form>
        </section>

        <div className="dashboard-event-side">
          <section className="dashboard-card dashboard-event-preview-card">
            <div className="dashboard-card-head">
              <div>
                <p className="dashboard-section-label">Front Preview</p>
                <h2>How the card will look on the site</h2>
              </div>
            </div>

            <article className="event-studio-preview">
              <div
                className="event-studio-preview-media"
                style={{ backgroundImage: `url(${previewImage})` }}
              >
                <div className="event-studio-preview-badge">
                  <span>{previewMonth || 'MON'}</span>
                  <strong>{previewDay || '--'}</strong>
                </div>

                <div className="event-studio-preview-copy">
                  <strong>{formData.title || 'Your next flagship event'}</strong>
                  <span>
                    {formData.totalSeats
                      ? `${formData.totalSeats} seats planned`
                      : 'Seat count ready to publish'}
                  </span>
                </div>
              </div>

              <div className="event-studio-preview-meta">
                <div>
                  <FiCalendar />
                  <span>
                    {previewDate && !Number.isNaN(previewDate.getTime())
                      ? dateLineFormatter.format(previewDate)
                      : 'Pick the date and time'}
                  </span>
                </div>
                <div>
                  <FiTag />
                  <span>
                    {formData.price ? `${formData.price} EUR` : 'Set the ticket price'}
                  </span>
                </div>
                <div>
                  <FiMapPin />
                  <span>{formData.address || 'Venue address will appear here'}</span>
                </div>
              </div>
            </article>
          </section>

          <section className="dashboard-card dashboard-event-list-card">
            <div className="dashboard-card-head">
              <div>
                <p className="dashboard-section-label">Published Events</p>
                <h2>Review what the front can already display</h2>
              </div>

              <button
                type="button"
                className="dashboard-secondary-button"
                onClick={handleRefresh}
                disabled={loadingEvents}
              >
                <FiRefreshCw />
                <span>{loadingEvents ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            <div className="dashboard-filter-switch">
              {EVENT_FILTER_OPTIONS.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`dashboard-filter-chip ${
                      eventsFilter === option.value ? 'active' : ''
                    }`}
                    onClick={() => handleFilterChange(option.value)}
                  >
                    <span className="dashboard-filter-chip-icon">
                      <Icon />
                    </span>
                    <span className="dashboard-filter-chip-copy">
                      <strong>{option.label}</strong>
                      <small>{option.helper}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="dashboard-list-subhead">
              <strong>
                {eventsFilter === 'all'
                  ? 'All events'
                  : eventsFilter === 'new'
                    ? 'Upcoming events'
                    : 'Past events'}
              </strong>
              <span>Switch views before editing or cleaning the showcase lineup.</span>
            </div>

            <div className="dashboard-event-list">
              {loadingEvents ? (
                <p className="dashboard-chart-empty">Loading event pages...</p>
              ) : eventsData.items.length ? (
                eventsData.items.map((event) => (
                  <article key={event._id} className="dashboard-event-list-item">
                    <img src={getImageUrl(event.image)} alt={event.title} />

                    <div className="dashboard-event-list-copy">
                      <div className="dashboard-event-list-head">
                        <strong>{event.title}</strong>
                        <span
                          className={`dashboard-event-status ${
                            isUpcomingEvent(event.date) ? 'is-upcoming' : 'is-archived'
                          }`}
                        >
                          {isUpcomingEvent(event.date) ? 'Upcoming' : 'Past'}
                        </span>
                      </div>

                      <div className="dashboard-event-inline-meta">
                        <span>
                          <FiClock />
                          {dateLineFormatter.format(new Date(event.date))}
                        </span>
                        <span>
                          <FiUsers />
                          {event.availableSeats} / {event.totalSeats} seats left
                        </span>
                      </div>

                      <div className="dashboard-event-inline-meta">
                        <span>
                          <FiTag />
                          {event.price} EUR
                        </span>
                        <span>
                          <FiMapPin />
                          {event.address}
                        </span>
                      </div>

                      <div className="dashboard-item-actions">
                        <button
                          type="button"
                          className="dashboard-inline-action"
                          onClick={() => handleEditEvent(event)}
                        >
                          <FiEdit2 />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="dashboard-inline-action dashboard-inline-action--danger"
                          onClick={() => handleDeleteEvent(event)}
                        >
                          <FiTrash2 />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="dashboard-event-empty">
                  <FiImage />
                  <div>
                    <strong>No events in this view yet</strong>
                    <p>Publish the first one from the form on the left.</p>
                  </div>
                </div>
              )}
            </div>

            {eventsData.pagination.totalPages > 1 ? (
              <div className="dashboard-pagination">
                <div className="dashboard-pagination-summary">
                  <strong>
                    Page {eventsData.pagination.page} of{' '}
                    {eventsData.pagination.totalPages}
                  </strong>
                  <span>{eventsData.pagination.totalItems} total events</span>
                </div>

                <div className="dashboard-pagination-controls">
                  <button
                    type="button"
                    className="dashboard-page-btn"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={!eventsData.pagination.hasPreviousPage}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft />
                  </button>

                  {paginationSequence.map((item) =>
                    typeof item === 'number' ? (
                      <button
                        key={item}
                        type="button"
                        className={`dashboard-page-btn dashboard-page-btn--number ${
                          item === eventsData.pagination.page ? 'active' : ''
                        }`}
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item} className="dashboard-page-ellipsis">
                        ...
                      </span>
                    ),
                  )}

                  <button
                    type="button"
                    className="dashboard-page-btn"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(eventsData.pagination.totalPages, page + 1),
                      )
                    }
                    disabled={!eventsData.pagination.hasNextPage}
                    aria-label="Next page"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
