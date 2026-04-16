import { useEffect, useMemo, useState } from 'react';
import { FiMessageSquare, FiRefreshCw, FiStar, FiTrash2 } from 'react-icons/fi';
import fallbackAvatarA from '../assets/images/user2.jpg';
import fallbackAvatarB from '../assets/images/user3.png';
import { requestJson } from '../utils/api';
import { errorToast, successToast } from '../utils/toast';

const REVIEWS_PER_PAGE = 6;
const fallbackAvatars = [fallbackAvatarA, fallbackAvatarB];

const buildVisiblePages = (currentPage, totalPages) => {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const pages = new Set([1, safeTotal, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= safeTotal)
    .sort((left, right) => left - right);
};

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const resolveAvatar = (review, index) =>
  review?.author?.avatarUrl || fallbackAvatars[index % 2];

export default function AdminReviewsPanel() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [busyReviewId, setBusyReviewId] = useState('');
  const [reviewsData, setReviewsData] = useState({
    items: [],
    stats: {
      totalItems: 0,
      averageRating: 0,
    },
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  });

  const loadReviews = async (page = currentPage) => {
    setLoading(true);

    try {
      const data = await requestJson(
        `/api/admin/reviews?page=${page}&limit=${REVIEWS_PER_PAGE}`,
      );
      setReviewsData(data);
    } catch (error) {
      errorToast(error.message || 'Unable to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const visiblePages = useMemo(
    () =>
      buildVisiblePages(reviewsData.pagination.page, reviewsData.pagination.totalPages),
    [reviewsData.pagination.page, reviewsData.pagination.totalPages],
  );

  const handleDelete = async (reviewId) => {
    const confirmed = window.confirm('Delete this testimonial from the showcase?');

    if (!confirmed) {
      return;
    }

    setBusyReviewId(reviewId);

    try {
      const response = await requestJson(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      successToast(response.message || 'Review deleted');

      const shouldGoBackOnePage =
        reviewsData.items.length === 1 && reviewsData.pagination.page > 1;

      if (shouldGoBackOnePage) {
        setCurrentPage((page) => page - 1);
      } else {
        await loadReviews(currentPage);
      }
    } catch (error) {
      errorToast(error.message || 'Unable to delete the review');
    } finally {
      setBusyReviewId('');
    }
  };

  return (
    <div className="dashboard-review-stack">
      <section className="dashboard-card dashboard-review-hero">
        <div className="dashboard-review-hero-copy">
          <p className="dashboard-section-label">Testimonials Control</p>
          <h2>
            Monitor every client review without breaking the front-end presentation.
          </h2>
          <p>
            Reviews published from verified client dashboards appear here in a clean
            queue. You can keep them live or remove them instantly from the showcase.
          </p>
        </div>

        <div className="dashboard-review-hero-stats">
          <article>
            <span>Total reviews</span>
            <strong>{reviewsData.stats.totalItems || 0}</strong>
          </article>
          <article>
            <span>Average rating</span>
            <strong>{Number(reviewsData.stats.averageRating || 0).toFixed(1)}</strong>
          </article>
          <article>
            <span>Status</span>
            <strong>Live sync</strong>
          </article>
        </div>
      </section>

      <section className="dashboard-card dashboard-reviews-admin-card">
        <div className="dashboard-card-head">
          <div>
            <p className="dashboard-section-label">Review List</p>
            <h2>Verified testimonials published by client accounts</h2>
          </div>

          <button
            type="button"
            className="dashboard-secondary-button"
            onClick={() => loadReviews(currentPage)}
            disabled={loading}
          >
            <FiRefreshCw />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        <div className="dashboard-review-admin-list">
          {loading ? (
            <p className="dashboard-chart-empty">Loading live reviews...</p>
          ) : reviewsData.items.length ? (
            reviewsData.items.map((review, index) => (
              <article key={review._id} className="dashboard-review-admin-item">
                <div className="dashboard-review-admin-head">
                  <div className="dashboard-review-admin-author">
                    <img
                      src={resolveAvatar(review, index)}
                      alt={review.author?.fullName || 'Client avatar'}
                    />
                    <div>
                      <strong>{review.author?.fullName || 'Verified client'}</strong>
                      <span>{review.author?.email || 'No email available'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="dashboard-danger-button"
                    onClick={() => handleDelete(review._id)}
                    disabled={busyReviewId === review._id}
                  >
                    <FiTrash2 />
                    <span>{busyReviewId === review._id ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>

                {review.headline ? (
                  <p className="dashboard-review-admin-headline">{review.headline}</p>
                ) : null}

                <p className="dashboard-review-admin-text">{review.text}</p>

                <div className="dashboard-review-admin-meta">
                  <div className="stars" aria-label={`${review.rating} star review`}>
                    {Array.from({ length: 5 }, (_, starIndex) => (
                      <span
                        key={`${review._id}-star-${starIndex + 1}`}
                        className={`star ${starIndex < review.rating ? 'is-active' : ''}`}
                      >
                        &#9733;
                      </span>
                    ))}
                  </div>

                  <span>
                    <FiStar />
                    {review.rating}/5
                  </span>
                  <span>Updated {formatDate(review.updatedAt || review.createdAt)}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="dashboard-service-empty dashboard-review-empty">
              <FiMessageSquare />
              <div>
                <strong>No client reviews yet</strong>
                <p>
                  As soon as users publish testimonials from their dashboard, they will
                  appear here.
                </p>
              </div>
            </div>
          )}
        </div>

        {reviewsData.pagination.totalPages > 1 ? (
          <div className="pagination-wrapper dashboard-pagination-wrapper">
            <button
              type="button"
              className="page-btn"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={!reviewsData.pagination.hasPreviousPage}
            >
              {'<'}
            </button>

            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                className={`page-btn ${page === reviewsData.pagination.page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="page-btn"
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(reviewsData.pagination.totalPages, page + 1),
                )
              }
              disabled={!reviewsData.pagination.hasNextPage}
            >
              {'>'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
