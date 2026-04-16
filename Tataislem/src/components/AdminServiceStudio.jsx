import { useEffect, useMemo, useState } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiImage,
  FiLayers,
  FiRefreshCw,
  FiTag,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import image1 from '../assets/images/relationship.webp';
import image2 from '../assets/images/business.png';
import image3 from '../assets/images/development.png';
import image4 from '../assets/images/leadership.png';
import { requestJson } from '../utils/api';
import { getImageUrl } from '../utils/media';
import { errorToast, successToast } from '../utils/toast';

const SERVICES_PER_PAGE = 6;
const fallbackImages = [image1, image2, image3, image4];
const serviceImagesMap = {
  '/images/relationship.webp': image1,
  '/images/business.png': image2,
  '/images/development.png': image3,
  '/images/leadership.png': image4,
};

const buildInitialFormData = () => ({
  title: '',
  shortDesc: '',
  fullDesc: '',
  price: '',
  durationMinutes: '60',
  stripePriceId: '',
  image: '',
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

const buildFormDataFromService = (service) => ({
  title: service?.title || '',
  shortDesc: service?.shortDesc || '',
  fullDesc: service?.fullDesc || '',
  price: String(service?.price ?? ''),
  durationMinutes: String(service?.durationMinutes ?? 60),
  stripePriceId: service?.stripePriceId || '',
  image: service?.image || '',
});

const requestServicesPage = (page, filter = 'all') =>
  requestJson(`/api/services?page=${page}&limit=${SERVICES_PER_PAGE}&filter=${filter}`);

const SERVICE_FILTER_OPTIONS = [
  {
    value: 'all',
    label: 'All',
    helper: 'Every published offer',
    icon: FiLayers,
  },
  {
    value: 'linked',
    label: 'Price Linked',
    helper: 'Stripe price IDs attached',
    icon: FiTag,
  },
  {
    value: 'inline',
    label: 'Inline',
    helper: 'Dynamic checkout pricing',
    icon: FiZap,
  },
];

const resolveServiceImage = (imagePath, fallbackIndex = 0) => {
  const fallback = fallbackImages[fallbackIndex % fallbackImages.length];

  if (!imagePath || typeof imagePath !== 'string') {
    return fallback;
  }

  const normalizedPath = imagePath.trim();

  if (!normalizedPath) {
    return fallback;
  }

  if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
    return normalizedPath;
  }

  if (serviceImagesMap[normalizedPath]) {
    return serviceImagesMap[normalizedPath];
  }

  return getImageUrl(normalizedPath);
};

export default function AdminServiceStudio({ stats, onServiceCreated }) {
  const [formData, setFormData] = useState(buildInitialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesFilter, setServicesFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [servicesData, setServicesData] = useState({
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

    const loadServices = async () => {
      setLoadingServices(true);

      try {
        const data = await requestServicesPage(currentPage, servicesFilter);

        if (ignore) {
          return;
        }

        setServicesData({
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
          errorToast(error.message || 'Unable to load services');
        }
      } finally {
        if (!ignore) {
          setLoadingServices(false);
        }
      }
    };

    loadServices();

    return () => {
      ignore = true;
    };
  }, [currentPage, servicesFilter]);

  const previewImage = useMemo(
    () => resolveServiceImage(formData.image, 0),
    [formData.image],
  );
  const visiblePages = buildVisiblePages(
    servicesData.pagination.page,
    servicesData.pagination.totalPages,
  );
  const paginationSequence = buildPaginationSequence(visiblePages);
  const publishedServicesCount = stats?.servicesCount || 0;
  const isEditing = Boolean(editingServiceId);

  const applyServicesData = (data, page) => {
    const resolvedPage = data.pagination?.page || page;

    setServicesData({
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
    setServicesFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    setLoadingServices(true);

    try {
      const data = await requestServicesPage(currentPage, servicesFilter);
      applyServicesData(data, currentPage);
    } catch (error) {
      errorToast(error.message || 'Unable to load services');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const requestUrl = editingServiceId
        ? `/api/services/${editingServiceId}`
        : '/api/services';
      const response = await requestJson(requestUrl, {
        method: editingServiceId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          durationMinutes: Number(formData.durationMinutes),
        }),
      });

      successToast(
        response.message ||
          (editingServiceId
            ? 'Service updated successfully'
            : 'Service published successfully'),
      );
      setFormData(buildInitialFormData());
      setEditingServiceId('');
      setLoadingServices(true);

      const nextFilter = editingServiceId ? servicesFilter : 'all';
      const nextPage = editingServiceId ? currentPage : 1;
      if (!editingServiceId) {
        setServicesFilter('all');
        setCurrentPage(1);
      }

      const refreshedData = await requestServicesPage(nextPage, nextFilter);
      applyServicesData(refreshedData, nextPage);

      if (typeof onServiceCreated === 'function') {
        await onServiceCreated();
      }
    } catch (error) {
      errorToast(
        error.message ||
          (editingServiceId
            ? 'Unable to update the service'
            : 'Unable to publish the service'),
      );
    } finally {
      setLoadingServices(false);
      setSubmitting(false);
    }
  };

  const handleEditService = (service) => {
    setEditingServiceId(service._id);
    setFormData(buildFormDataFromService(service));
  };

  const handleCancelEdit = () => {
    setEditingServiceId('');
    setFormData(buildInitialFormData());
  };

  const handleDeleteService = async (service) => {
    const shouldDelete = window.confirm(
      `Remove "${service.title}" from the showcase? Existing booked services will be archived safely.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await requestJson(`/api/services/${service._id}`, {
        method: 'DELETE',
      });

      successToast(response.message || 'Service deleted successfully');

      if (editingServiceId === service._id) {
        handleCancelEdit();
      }

      setLoadingServices(true);
      const refreshedData = await requestServicesPage(currentPage, servicesFilter);
      applyServicesData(refreshedData, currentPage);

      if (typeof onServiceCreated === 'function') {
        await onServiceCreated();
      }
    } catch (error) {
      errorToast(error.message || 'Unable to delete the service');
    } finally {
      setLoadingServices(false);
    }
  };

  return (
    <div className="dashboard-service-stack">
      <section className="dashboard-card dashboard-service-hero">
        <div className="dashboard-service-hero-copy">
          <p className="dashboard-section-label">Service Studio</p>
          <h2>Launch new premium services from the admin dashboard.</h2>
          <p>
            Add a new offer here and it will appear in the public services section with
            the same premium card design clients already know.
          </p>
        </div>

        <div className="dashboard-service-hero-stats">
          <article>
            <span>Published</span>
            <strong>{publishedServicesCount}</strong>
          </article>
          <article>
            <span>Checkout</span>
            <strong>Stripe ready</strong>
          </article>
          <article>
            <span>Scheduling</span>
            <strong>Calendar linked</strong>
          </article>
        </div>
      </section>

      <div className="dashboard-service-grid">
        <section className="dashboard-card dashboard-service-form-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-section-label">Create Service</p>
              <h2>
                {isEditing
                  ? 'Adjust the live service details'
                  : 'Define the offer and client promise'}
              </h2>
            </div>
            <span className="dashboard-card-pill">
              {isEditing ? 'Editing live service' : 'Front-ready'}
            </span>
          </div>

          {isEditing ? (
            <div className="dashboard-editor-banner">
              <div>
                <strong>Editing in place</strong>
                <p>Save changes to refresh the live service card instantly.</p>
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

          <form className="dashboard-form dashboard-service-form" onSubmit={handleSubmit}>
            <label className="dashboard-field">
              <span>Service title</span>
              <input
                type="text"
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Personal brand intensive, strategy call..."
                required
              />
            </label>

            <label className="dashboard-field">
              <span>Short description</span>
              <textarea
                rows="3"
                value={formData.shortDesc}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    shortDesc: event.target.value,
                  }))
                }
                placeholder="This appears on the service card in the public section."
                required
              />
            </label>

            <label className="dashboard-field">
              <span>Full description</span>
              <textarea
                rows="5"
                value={formData.fullDesc}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    fullDesc: event.target.value,
                  }))
                }
                placeholder="Explain the transformation, the format, and what the client receives."
                required
              />
            </label>

            <div className="auth-grid-two">
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
                  placeholder="450"
                  required
                />
              </label>

              <label className="dashboard-field">
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.durationMinutes}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                  placeholder="60"
                  required
                />
              </label>
            </div>

            <div className="auth-grid-two">
              <label className="dashboard-field">
                <span>Stripe Price ID</span>
                <input
                  type="text"
                  value={formData.stripePriceId}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      stripePriceId: event.target.value,
                    }))
                  }
                  placeholder="Optional for now"
                />
                <small className="dashboard-input-note">
                  Optional. The current checkout flow can generate pricing inline.
                </small>
              </label>

              <label className="dashboard-field">
                <span>Image path or URL</span>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, image: event.target.value }))
                  }
                  placeholder="/uploads/serviceold.png or https://..."
                />
                <small className="dashboard-input-note">
                  You can reuse legacy images like `/images/relationship.webp` or new
                  uploads.
                </small>
              </label>
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting
                ? isEditing
                  ? 'Saving changes...'
                  : 'Publishing service...'
                : isEditing
                  ? 'Save Service Changes'
                  : 'Publish Service'}
            </button>
          </form>
        </section>

        <div className="dashboard-service-side">
          <section className="dashboard-card dashboard-service-preview-card">
            <div className="dashboard-card-head">
              <div>
                <p className="dashboard-section-label">Front Preview</p>
                <h2>How the service will look on the website</h2>
              </div>
            </div>

            <div className="services-card-new service-card-preview">
              <div className="services-image-new">
                <img src={previewImage} alt={formData.title || 'Service preview'} />
              </div>

              <div className="services-body-new">
                <h4>{formData.title || 'Your new premium service'}</h4>
                <p>
                  {formData.shortDesc ||
                    'Your short description will appear here and keep the same visual style.'}
                </p>

                <div className="service-preview-meta">
                  <span>
                    <FiTag />
                    {formData.price ? `EUR ${formData.price}` : 'Set the price'}
                  </span>
                  <span>
                    <FiClock />
                    {formData.durationMinutes
                      ? `${formData.durationMinutes} min`
                      : 'Set the duration'}
                  </span>
                </div>

                <div className="services-buttons">
                  <button type="button" className="details-btn">
                    View Details
                  </button>
                  <button type="button" className="book-btn">
                    Book
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-card dashboard-service-list-card">
            <div className="dashboard-card-head">
              <div>
                <p className="dashboard-section-label">Published Services</p>
                <h2>Review what is already live on the showcase</h2>
              </div>

              <button
                type="button"
                className="dashboard-secondary-button"
                onClick={handleRefresh}
                disabled={loadingServices}
              >
                <FiRefreshCw />
                <span>{loadingServices ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            <div className="dashboard-service-list">
              <div className="dashboard-filter-switch">
                {SERVICE_FILTER_OPTIONS.map((option) => {
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`dashboard-filter-chip ${
                        servicesFilter === option.value ? 'active' : ''
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
                  {servicesFilter === 'all'
                    ? 'All services'
                    : servicesFilter === 'linked'
                      ? 'Price-linked services'
                      : 'Inline checkout services'}
                </strong>
                <span>Choose a view before editing or deleting an offer.</span>
              </div>

              {loadingServices ? (
                <p className="dashboard-chart-empty">Loading service pages...</p>
              ) : servicesData.items.length ? (
                servicesData.items.map((service, index) => (
                  <article key={service._id} className="dashboard-service-list-item">
                    <img
                      src={resolveServiceImage(service.image, index)}
                      alt={service.title}
                    />

                    <div className="dashboard-service-list-copy">
                      <div className="dashboard-service-list-head">
                        <strong>{service.title}</strong>
                        <span className="dashboard-service-status">Active</span>
                      </div>

                      <p>{service.shortDesc}</p>

                      <div className="dashboard-service-inline-meta">
                        <span>
                          <FiTag />
                          EUR {Number(service.price || 0).toLocaleString()}
                        </span>
                        <span>
                          <FiClock />
                          {service.durationMinutes || 60} min
                        </span>
                        <span>
                          <FiLayers />
                          {service.stripePriceId
                            ? 'Price ID linked'
                            : 'Inline checkout ready'}
                        </span>
                      </div>

                      <div className="dashboard-item-actions">
                        <button
                          type="button"
                          className="dashboard-inline-action"
                          onClick={() => handleEditService(service)}
                        >
                          <FiEdit2 />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="dashboard-inline-action dashboard-inline-action--danger"
                          onClick={() => handleDeleteService(service)}
                        >
                          <FiTrash2 />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="dashboard-service-empty">
                  <FiImage />
                  <div>
                    <strong>No services published yet</strong>
                    <p>Create the first offer from the form on the left.</p>
                  </div>
                </div>
              )}
            </div>

            {servicesData.pagination.totalPages > 1 ? (
              <div className="dashboard-pagination">
                <div className="dashboard-pagination-summary">
                  <strong>
                    Page {servicesData.pagination.page} of{' '}
                    {servicesData.pagination.totalPages}
                  </strong>
                  <span>{servicesData.pagination.totalItems} total services</span>
                </div>

                <div className="dashboard-pagination-controls">
                  <button
                    type="button"
                    className="dashboard-page-btn"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={!servicesData.pagination.hasPreviousPage}
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
                          item === servicesData.pagination.page ? 'active' : ''
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
                        Math.min(servicesData.pagination.totalPages, page + 1),
                      )
                    }
                    disabled={!servicesData.pagination.hasNextPage}
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
