import { useEffect, useState } from 'react';
import {
  FiCalendar,
  FiDownload,
  FiFileText,
  FiLayers,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import { requestJson } from '../utils/api';
import { errorToast } from '../utils/toast';

const BOOKINGS_PER_PAGE = 8;

const initialBookingsState = {
  items: [],
  stats: {
    totalBookings: 0,
    eventReservations: 0,
    serviceReservations: 0,
    uniqueClients: 0,
    totalRevenue: 0,
  },
  filters: {
    type: 'all',
    search: '',
  },
  pagination: {
    page: 1,
    totalPages: 1,
    totalItems: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

const bookingFilterOptions = [
  {
    value: 'all',
    label: 'All',
    helper: 'Events and services',
    icon: FiLayers,
  },
  {
    value: 'event',
    label: 'Events',
    helper: 'Paid event reservations',
    icon: FiCalendar,
  },
  {
    value: 'service',
    label: 'Services',
    helper: 'Booked client sessions',
    icon: FiFileText,
  },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
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

const formatDateTime = (value) => {
  if (!value) {
    return 'Not scheduled yet';
  }

  return dateTimeFormatter.format(new Date(value));
};

const getInitials = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'TI';

const parseFilenameFromDisposition = (headerValue) => {
  if (!headerValue) {
    return null;
  }

  const match = /filename="([^"]+)"/i.exec(headerValue);
  return match?.[1] || null;
};

export default function AdminBookingsPanel() {
  const [bookings, setBookings] = useState(initialBookingsState);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportingFormat, setExportingFormat] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadBookings = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(BOOKINGS_PER_PAGE),
          type: typeFilter,
        });

        if (searchTerm) {
          params.set('search', searchTerm);
        }

        const data = await requestJson(`/api/admin/bookings?${params.toString()}`);

        if (!ignore) {
          setBookings(data);
        }
      } catch (error) {
        if (!ignore) {
          errorToast(error.message || 'Unable to load bookings');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadBookings();

    return () => {
      ignore = true;
    };
  }, [currentPage, searchTerm, typeFilter]);

  const visiblePages = buildVisiblePages(
    bookings.pagination.page,
    bookings.pagination.totalPages,
  );
  const paginationSequence = buildPaginationSequence(visiblePages);

  const handleFilterChange = (nextFilter) => {
    setTypeFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(BOOKINGS_PER_PAGE),
        type: typeFilter,
      });

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const data = await requestJson(`/api/admin/bookings?${params.toString()}`);
      setBookings(data);
    } catch (error) {
      errorToast(error.message || 'Unable to refresh bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExportingFormat(format);

    try {
      const params = new URLSearchParams({
        format,
        type: typeFilter,
      });

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const response = await fetch(`/api/admin/bookings/export?${params.toString()}`);

      if (!response.ok) {
        let data = null;

        try {
          data = await response.json();
        } catch {
          data = null;
        }

        throw new Error(data?.error || 'Unable to export reservations report');
      }

      const blob = await response.blob();
      const filename =
        parseFilenameFromDisposition(response.headers.get('Content-Disposition')) ||
        `tataislem-bookings.${format === 'pdf' ? 'pdf' : 'xls'}`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      errorToast(error.message);
    } finally {
      setExportingFormat('');
    }
  };

  const stats = bookings.stats || initialBookingsState.stats;

  const summaryCards = [
    {
      label: 'Total bookings',
      value: stats.totalBookings,
      helper: 'Combined confirmed reservations',
      accent: 'gold',
    },
    {
      label: 'Event clients',
      value: stats.eventReservations,
      helper: 'People booked into events',
      accent: 'blue',
    },
    {
      label: 'Service clients',
      value: stats.serviceReservations,
      helper: 'Paid premium service bookings',
      accent: 'green',
    },
    {
      label: 'Unique clients',
      value: stats.uniqueClients,
      helper: 'Distinct client emails',
      accent: 'rose',
    },
  ];

  return (
    <div className="dashboard-booking-stack">
      <section className="dashboard-card dashboard-booking-hero">
        <div className="dashboard-booking-hero-copy">
          <p className="dashboard-section-label">Bookings Control</p>
          <h2>Track exactly who reserved an event or a service.</h2>
          <p>
            This admin view centralizes client names, contact details, booking type,
            amount, schedule timing, and export in PDF or Excel.
          </p>
        </div>

        <div className="dashboard-booking-hero-side">
          <article>
            <span>Revenue</span>
            <strong>{currencyFormatter.format(stats.totalRevenue || 0)}</strong>
          </article>
          <article>
            <span>Current view</span>
            <strong>
              {typeFilter === 'all'
                ? 'All bookings'
                : typeFilter === 'event'
                  ? 'Event bookings'
                  : 'Service bookings'}
            </strong>
          </article>
        </div>
      </section>

      <div className="dashboard-booking-summary-grid">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className={`dashboard-booking-summary-card is-${card.accent}`}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.helper}</p>
          </article>
        ))}
      </div>

      <section className="dashboard-card dashboard-booking-list-card">
        <div className="dashboard-card-head">
          <div>
            <p className="dashboard-section-label">Reservations Feed</p>
            <h2>Clients, bookings, and reserved offers</h2>
          </div>

          <div className="dashboard-booking-header-actions">
            <button
              type="button"
              className="dashboard-secondary-button"
              onClick={handleRefresh}
              disabled={loading}
            >
              <FiRefreshCw />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-filter-switch">
          {bookingFilterOptions.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                className={`dashboard-filter-chip ${typeFilter === option.value ? 'active' : ''}`}
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

        <div className="dashboard-booking-toolbar">
          <form className="dashboard-booking-search" onSubmit={handleSearchSubmit}>
            <label className="dashboard-search-field">
              <FiSearch />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by client, email, phone, event or service..."
              />
            </label>
            <button type="submit" className="dashboard-secondary-button">
              <FiSearch />
              <span>Search</span>
            </button>
            {searchTerm || searchInput ? (
              <button
                type="button"
                className="dashboard-text-button"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            ) : null}
          </form>

          <div className="dashboard-booking-export-actions">
            <button
              type="button"
              className="dashboard-secondary-button"
              onClick={() => handleExport('pdf')}
              disabled={exportingFormat === 'pdf'}
            >
              <FiDownload />
              <span>{exportingFormat === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}</span>
            </button>
            <button
              type="button"
              className="dashboard-secondary-button"
              onClick={() => handleExport('xls')}
              disabled={exportingFormat === 'xls'}
            >
              <FiDownload />
              <span>
                {exportingFormat === 'xls' ? 'Exporting Excel...' : 'Export Excel'}
              </span>
            </button>
          </div>
        </div>

        <div className="dashboard-list-subhead">
          <strong>
            {typeFilter === 'all'
              ? 'All confirmed bookings'
              : typeFilter === 'event'
                ? 'Event reservation clients'
                : 'Service reservation clients'}
          </strong>
          <span>
            {searchTerm
              ? `Filtered by "${searchTerm}".`
              : 'Browse the latest reservations before exporting the report.'}
          </span>
        </div>

        <div className="dashboard-booking-list">
          {loading ? (
            <p className="dashboard-chart-empty">Loading reservations feed...</p>
          ) : bookings.items.length ? (
            bookings.items.map((item) => (
              <article
                key={`${item.type}-${item._id}`}
                className="dashboard-booking-item"
              >
                <div className="dashboard-booking-client">
                  <span className="dashboard-booking-avatar">
                    {getInitials(item.clientName)}
                  </span>
                  <div>
                    <strong>{item.clientName}</strong>
                    <span>{item.email}</span>
                  </div>
                </div>

                <div className="dashboard-booking-main">
                  <div className="dashboard-booking-head">
                    <div>
                      <div className="dashboard-booking-pill-row">
                        <span className={`dashboard-booking-type is-${item.type}`}>
                          {item.typeLabel}
                        </span>
                        <span className="dashboard-booking-status">
                          {item.statusLabel}
                        </span>
                      </div>
                      <h3>{item.bookingTitle}</h3>
                    </div>

                    <strong className="dashboard-booking-amount">
                      {currencyFormatter.format(item.amount || 0)}
                    </strong>
                  </div>

                  <div className="dashboard-booking-meta">
                    <span>
                      <FiPhone />
                      {item.phoneNumber}
                    </span>
                    <span>
                      <FiCalendar />
                      {item.secondaryLine}
                    </span>
                    <span>
                      <FiUsers />
                      Reserved on {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="dashboard-booking-empty">
              <FiFileText />
              <div>
                <strong>No bookings found</strong>
                <p>Try another filter or search term to find the right clients.</p>
              </div>
            </div>
          )}
        </div>

        {bookings.pagination.totalPages > 1 ? (
          <div className="dashboard-pagination">
            <div className="dashboard-pagination-summary">
              <strong>
                Page {bookings.pagination.page} of {bookings.pagination.totalPages}
              </strong>
              <span>{bookings.pagination.totalItems} total reservations</span>
            </div>

            <div className="dashboard-pagination-controls">
              <button
                type="button"
                className="dashboard-page-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={!bookings.pagination.hasPreviousPage}
                aria-label="Previous page"
              >
                ‹
              </button>

              {paginationSequence.map((item) =>
                typeof item === 'number' ? (
                  <button
                    key={item}
                    type="button"
                    className={`dashboard-page-btn dashboard-page-btn--number ${
                      item === bookings.pagination.page ? 'active' : ''
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
                    Math.min(bookings.pagination.totalPages, page + 1),
                  )
                }
                disabled={!bookings.pagination.hasNextPage}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
