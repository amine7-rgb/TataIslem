import { useState } from 'react';
import CountUp from 'react-countup';
import aboutImg from '../assets/images/islemabout.jpg';
import brainzBadge from '../assets/images/brainz-executive-contributor-badge.png';

const pillars = ['Identity', 'Presence', 'Precision', 'Legacy'];

export default function AboutSection() {
  const [showMore, setShowMore] = useState(false);

  return (
    <section id="about" className="about-section about-section--editorial">
      <div className="container about-editorial-shell">
        <h2 className="section-title">About Us</h2>

        <div className="about-editorial-card">
          <div className="about-editorial-portrait">
            <div className="about-editorial-portrait-frame">
              <img src={aboutImg} alt="Islem Tounsi" />
            </div>

            <div className="about-editorial-badge-stat about-editorial-badge-stat--followers">
              <h4>
                <CountUp end={700} duration={2} />
                <span>K+</span>
              </h4>
              <p>Followers</p>
            </div>

            <div className="about-editorial-badge-stat about-editorial-badge-stat--experience">
              <h4>
                +
                <span className="about-editorial-experience-number">
                  <CountUp end={12} duration={2} />
                </span>
              </h4>
              <p>
                Years of
                <br />
                experience
              </p>
            </div>
          </div>

          <div className="about-editorial-copy">
            <span className="about-editorial-kicker">
              Human &amp; Business Strategist
            </span>
            <h3>Islem Tounsi</h3>
            <p className="about-editorial-role">
              Executive Contributor at <strong>Brainz Magazine</strong>
            </p>
            <p className="about-editorial-lead">Building leaders from the inside out.</p>

            <div className="about-editorial-pillars" aria-label="Core pillars">
              {pillars.map((pillar) => (
                <span key={pillar}>{pillar}</span>
              ))}
            </div>

            <div className="about-editorial-body">
              <p>
                I work as a Human &amp; Business Strategist, helping people clear the
                mental noise that keeps them stuck and reconnect with their true
                direction.
              </p>

              <p>
                This is not about abstract motivation, it&apos;s about clarity, aligned
                decisions, and concrete action.
              </p>

              <div className={`about-hidden-text ${showMore ? 'open' : ''}`}>
                <p>
                  My role is to guide individuals to step fully into themselves with
                  confidence, precision, and purpose. My approach blends strategic
                  thinking with deep human understanding, creating transformation that is
                  both practical and sustainable. Together, we simplify complexity, remove
                  internal friction, and build a path forward that feels aligned and
                  powerful.
                </p>

                {showMore ? (
                  <div className="about-editorial-stats">
                    <div className="about-editorial-stat-item">
                      <h4>
                        <CountUp end={120} duration={2} />
                      </h4>
                      <p>mentoring Sessions</p>
                    </div>

                    <div className="about-editorial-stat-item">
                      <h4>
                        <CountUp end={500} duration={2} />+
                      </h4>
                      <p>People Guided</p>
                    </div>

                    <div className="about-editorial-stat-item">
                      <h4>
                        <CountUp end={30} duration={2} />
                      </h4>
                      <p>Life Transformations</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <button className="about-see-more" onClick={() => setShowMore(!showMore)}>
              {showMore ? 'Show Less' : 'More Details'}
            </button>
          </div>

          <div className="about-editorial-badge">
            <span className="about-editorial-badge-label">
              2026 | Brainz Magazine Executive Contributor
            </span>

            <div className="about-editorial-medal">
              <img src={brainzBadge} alt="Executive Contributor Brainz Magazine badge" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
