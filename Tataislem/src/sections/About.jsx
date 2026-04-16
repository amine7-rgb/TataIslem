import { useRef, useEffect, useState } from 'react';
import CountUp from 'react-countup';
import aboutImg from '../assets/images/islemabout.jpg';

export default function AboutSection() {
  const aboutRef = useRef(null);
  const [showImage, setShowImage] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowImage(true);
            setTimeout(() => setShowContent(true), 600);
            setTimeout(() => setShowBadge(true), 1200);
          }
        });
      },
      { threshold: 0.3 },
    );

    if (aboutRef.current) observer.observe(aboutRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" ref={aboutRef} className="about-section">
      <div className="container">
        <h2 className="section-title">About Us</h2>

        <div className="about-grid">
          <div className={`about-image ${showImage ? 'show-image' : ''}`}>
            <img src={aboutImg} alt="about" />

            <div className={`badge badge-projects ${showContent ? 'show-content' : ''}`}>
              <h2>
                <CountUp end={700} duration={2} /> <span>K+</span>
              </h2>
              <p>Followers</p>
            </div>

            <div className={`badge badge-exp ${showBadge ? 'show-badge' : ''}`}>
              <h2>
                +<CountUp end={12} duration={2} />
              </h2>
              <p>
                Years of <br /> Experience
              </p>
            </div>
          </div>

          <div className={`about-content ${showContent ? 'show-content' : ''}`}>
            <h3>ISLEM TOUNSI</h3>

            <p>
              I work as a Human & Business Strategist, helping people clear the mental
              noise that keeps them stuck and reconnect with their true direction.
            </p>

            <p>
              This is not about abstract motivation ,it’s about clarity, aligned
              decisions, and concrete action.
            </p>

            <p className={`about-hidden-text ${showMore ? 'open' : ''}`}>
              My role is to guide individuals to step fully into themselves with
              confidence, precision, and purpose. My approach blends strategic thinking
              with deep human understanding, creating transformation that is both
              practical and sustainable. Together, we simplify complexity, remove internal
              friction, and build a path forward that feels aligned and powerful.
            </p>

            <button className="about-see-more" onClick={() => setShowMore(!showMore)}>
              {showMore ? 'Show Less' : 'More Details'}
            </button>

            <div className="about-stats">
              <div className="stat-item">
                <h3>
                  <CountUp end={120} duration={2} />
                </h3>
                <p>mentoring Sessions</p>
              </div>

              <div className="stat-item">
                <h3>
                  <CountUp end={500} duration={2} />+
                </h3>
                <p>People Guided</p>
              </div>

              <div className="stat-item">
                <h3>
                  <CountUp end={30} duration={2} />
                </h3>
                <p>Life Transformations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
