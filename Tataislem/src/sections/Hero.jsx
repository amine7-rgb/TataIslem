import React from 'react';
import hero1 from '../assets/videos/hero22.mp4';
import hero2 from '../assets/videos/hero33.mp4';
import hero3 from '../assets/videos/heroo.mp4';

export default function Hero() {
  return (
    <section id="hero" className="hero-carousel">
      <div id="heroCarousel" className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <video src={hero2} autoPlay loop muted className="d-block w-100" />
            <div className="carousel-caption glass-caption">
              <h1>Clarity without overthinking</h1>
              <p>Remove mental noise. Move with ease and precision.</p>
              <a href="#about" className="btn btn-gold">
                Discover
              </a>
            </div>
          </div>

          <div className="carousel-item">
            <video src={hero1} autoPlay loop muted className="d-block w-100" />
            <div className="carousel-caption glass-caption">
              <h1>The right move, at the right time</h1>
              <p>Success isn’t force — it’s aligned action.</p>
              <a href="#services" className="btn btn-gold">
                Our accompaniments
              </a>
            </div>
          </div>

          <div className="carousel-item">
            <video src={hero3} autoPlay loop muted className="d-block w-100" />
            <div className="carousel-caption glass-caption">
              <h1>Move forward, naturally</h1>
              <p>No struggle. No doubt. Only the steps that elevate your next chapter.</p>
              <a href="#contact" className="btn btn-gold">
                Start now
              </a>
            </div>
          </div>
        </div>

        <button
          className="carousel-control-prev"
          type="button"
          data-bs-target="#heroCarousel"
          data-bs-slide="prev"
        >
          <span className="carousel-control-prev-icon"></span>
        </button>
        <button
          className="carousel-control-next"
          type="button"
          data-bs-target="#heroCarousel"
          data-bs-slide="next"
        >
          <span className="carousel-control-next-icon"></span>
        </button>
      </div>
    </section>
  );
}
