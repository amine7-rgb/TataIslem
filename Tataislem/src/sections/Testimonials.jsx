import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import fallbackAvatarA from '../assets/images/user3.png';
import fallbackAvatarB from '../assets/images/user2.jpg';
import { useAuth } from '../hooks/useAuth';
import { requestJson } from '../utils/api';

const fallbackAvatars = [fallbackAvatarA, fallbackAvatarB];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonialsData, setTestimonialsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let ignore = false;

    const loadTestimonials = async () => {
      try {
        const data = await requestJson('/api/reviews?limit=12');

        if (!ignore) {
          setTestimonialsData(data.items || []);
        }
      } catch {
        if (!ignore) {
          setTestimonialsData([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadTestimonials();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (currentIndex > testimonialsData.length - 1) {
      setCurrentIndex(0);
    }
  }, [currentIndex, testimonialsData.length]);

  const visibleTestimonials = useMemo(() => testimonialsData, [testimonialsData]);
  const canRotate = visibleTestimonials.length > 1;
  const shareLink = user ? '/dashboard' : '/auth';
  const shareLabel = user ? 'Write Your Review' : 'Sign In To Review';

  const prevCard = () => {
    if (!canRotate) {
      return;
    }

    setCurrentIndex(
      currentIndex === 0 ? visibleTestimonials.length - 1 : currentIndex - 1,
    );
  };

  const nextCard = () => {
    if (!canRotate) {
      return;
    }

    setCurrentIndex(
      currentIndex === visibleTestimonials.length - 1 ? 0 : currentIndex + 1,
    );
  };

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (event) => {
    touchStartX.current = event.changedTouches[0].screenX;
  };

  const handleTouchEnd = (event) => {
    touchEndX.current = event.changedTouches[0].screenX;

    if (touchStartX.current - touchEndX.current > 50) nextCard();
    if (touchEndX.current - touchStartX.current > 50) prevCard();
  };

  return (
    <section id="testimonials" className="testimonials-section">
      <div className="container">
        <div className="testimonials-heading">
          <div>
            <h2 className="title">Testimonials</h2>
            <p className="desc">Real leaders. Real recalibration. Real results.</p>
          </div>

          <Link className="testimonials-cta" to={shareLink}>
            {shareLabel}
          </Link>
        </div>

        {loading ? (
          <div className="testimonials-empty-card">
            <p>Loading client testimonials...</p>
          </div>
        ) : visibleTestimonials.length ? (
          <div className="testimonials-wrapper">
            {canRotate ? (
              <button className="arrow prev" type="button" onClick={prevCard}>
                &#8249;
              </button>
            ) : null}

            <div
              className="testimonials-grid"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {visibleTestimonials.map((testimonial, index) => {
                let className = 'testimonial-card side';

                if (index === currentIndex) className = 'testimonial-card center';
                else if (
                  index ===
                  (currentIndex - 1 + visibleTestimonials.length) %
                    visibleTestimonials.length
                )
                  className = 'testimonial-card side-left';
                else if (index === (currentIndex + 1) % visibleTestimonials.length)
                  className = 'testimonial-card side-right';

                return (
                  <div key={testimonial._id} className={className}>
                    <div className="testimonial-copy">
                      {testimonial.headline ? (
                        <p className="testimonial-headline">{testimonial.headline}</p>
                      ) : null}

                      <p className="info-block">{testimonial.text}</p>
                    </div>

                    <div className="person">
                      <div className="icon-block">
                        <img
                          src={
                            testimonial.author?.avatarUrl || fallbackAvatars[index % 2]
                          }
                          alt={testimonial.author?.fullName || 'Verified client'}
                          onError={(event) => {
                            event.currentTarget.src = fallbackAvatars[index % 2];
                          }}
                        />
                      </div>

                      <div className="text-block">
                        <p className="name">
                          {testimonial.author?.fullName || 'Verified client'}
                        </p>

                        <div
                          className="stars"
                          aria-label={`${testimonial.rating} star review`}
                        >
                          {Array.from({ length: 5 }, (_, starIndex) => (
                            <span
                              key={`${testimonial._id}-star-${starIndex + 1}`}
                              className={`star ${
                                starIndex < testimonial.rating ? 'is-active' : ''
                              }`}
                            >
                              &#9733;
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {canRotate ? (
              <button className="arrow next" type="button" onClick={nextCard}>
                &#8250;
              </button>
            ) : null}
          </div>
        ) : (
          <div className="testimonials-empty-card">
            <strong>No client testimonials published yet</strong>
            <p>
              Verified clients can now publish their own review from the dashboard. The
              showcase will update here automatically.
            </p>
            <Link className="testimonials-cta" to={shareLink}>
              {shareLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
