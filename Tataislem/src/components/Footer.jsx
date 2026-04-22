import React from 'react';
import { FaWhatsapp, FaLinkedin, FaInstagram } from 'react-icons/fa';
import logo from '../assets/images/logo.jpeg';

export default function Footer() {
  return (
    <footer id="footer">
      <div className="footer-top container">
        <div className="footer-col brand">
          <img src={logo} alt="Logo" className="footer-logo" />
          <p>
            Spiritual mentoring designed to help you reconnect with your inner clarity,
            align your decisions, and live consciously every moment.
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
