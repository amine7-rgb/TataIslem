import { useEffect, useMemo, useState } from 'react';
import ServiceCard from '../components/ServiceCard';
import { requestJson } from '../utils/api';
import { errorToast } from '../utils/toast';

const SERVICES_PER_PAGE = 6;

const buildVisiblePages = (currentPage, totalPages) => {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const pages = new Set([1, safeTotal, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= safeTotal)
    .sort((left, right) => left - right);
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingServices, setLoadingServices] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  useEffect(() => {
    let ignore = false;

    const fetchServices = async () => {
      setLoadingServices(true);

      try {
        const data = await requestJson(
          `/api/services?page=${currentPage}&limit=${SERVICES_PER_PAGE}`,
        );

        if (ignore) {
          return;
        }

        setServices(data.items || []);
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
          errorToast(error.message || 'Failed to load services');
        }
      } finally {
        if (!ignore) {
          setLoadingServices(false);
        }
      }
    };

    fetchServices();

    return () => {
      ignore = true;
    };
  }, [currentPage]);

  const visiblePages = useMemo(
    () => buildVisiblePages(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  return (
    <section id="services">
      <h2 className="section-title">Our Services</h2>

      <p className="section-desc">
        Discover our premium transformational services designed for high-level
        individuals.
      </p>

      <div className="services-grid">
        {loadingServices ? (
          <div className="services-empty-state">
            <p>Loading the latest services...</p>
          </div>
        ) : services.length ? (
          services.map((service, index) => (
            <ServiceCard key={service._id} service={service} index={index} />
          ))
        ) : (
          <div className="services-empty-state">
            <p>No services are available yet.</p>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className="pagination-wrapper services-pagination-wrapper">
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
    </section>
  );
}
