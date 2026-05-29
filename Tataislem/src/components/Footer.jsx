import React from 'react';
import { FaWhatsapp, FaLinkedin, FaInstagram } from 'react-icons/fa';
import logo from '../assets/images/logo.jpeg';
import brainzBadge from '../assets/images/brainz-executive-contributor-badge.png';

export default function Footer() {
  return (
    <footer id="footer">
      <div className="footer-top container">
        <div className="footer-col brand">
          <div className="footer-brand-head">
            <div className="footer-authority-pill">
              <div className="footer-authority-logo">
                <img src={logo} alt="Tata Islem logo" className="footer-logo" />
              </div>

              <div className="footer-authority-copy">
                <span>2026</span>
                <div>
                  <strong>Brainz Magazine</strong>
                  <small>Executive Contributor</small>
                </div>
              </div>

              <div className="footer-authority-badge">
                <img
                  src={brainzBadge}
                  alt="Brainz Magazine Executive Contributor badge"
                />
              </div>
            </div>
          </div>

          <p>
            We are born great. My work helps people reconnect with that greatness, embody
            their truth, and build a life, leadership, and business that reflects who they
            truly are.
          </p>
        </div>

        <div className="footer-col nav">
          <h4>Navigation</h4>
          <a href="#hero">Accueil</a>
          <a href="#about">About</a>
          <a href="#events">Événements</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-col contact">
          <h4>Connect</h4>

          <div className="social-icons">
            <a
              href="https://www.instagram.com/tataislem/?hl=en"
              target="_blank"
              rel="noreferrer"
            >
              <FaInstagram />
            </a>
            <a
              href="linkedin.com/in/tataislem?originalSubdomain=de"
              target="_blank"
              rel="noreferrer"
            >
              <FaLinkedin />
            </a>
            <a
              href="https://web.whatsapp.com/send/?phone=4917620730425&text&type=phone_number&app_absent=0"
              target="_blank"
              rel="noreferrer"
            >
              <FaWhatsapp />
            </a>
          </div>

          <p className="contact-note">
            Reach out anytime — your transformation starts with a message.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} Human & business strategist — All rights reserved
      </div>
    </footer>
  );
}
