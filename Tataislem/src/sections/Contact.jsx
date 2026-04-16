import React, { useState } from 'react';
import { FaMapMarkerAlt, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { errorToast, successToast } from '../utils/toast';
import 'react-phone-input-2/lib/style.css';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.email || !formData.message) {
      errorToast('Please fill in all fields!');
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      successToast('Your message has been sent! ✅');

      setFormData({
        name: '',
        phone: '',
        email: '',
        message: '',
      });
    } catch (err) {
      errorToast(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <section id="contact">
      <div className="container">
        <h2 className="section-title">Contact Us</h2>
        <p className="section-description">
          We would love to hear from you. Whether you’re seeking guidance, clarity, or
          simply want to begin your transformation journey, reach out and let’s connect.
          Every message is answered with care, presence, and intention.
        </p>

        <div className="form-container">
          <div className="left-container">
            <iframe
              title="Google Map"
              className="map-bg-iframe"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3192.7876896882717!2d10.21498517530527!3d36.847560465029325!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12e2cad2e1d7f1bb%3A0x902488d100b5819b!2sA%C3%A9roport%20de%20Tunis-Carthage!5e0!3m2!1sfr!2stn!4v1769871157965!5m2!1sfr!2stn"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            <div className="contact-card">
              <h2
                style={{
                  fontFamily: "'Mitr', sans-serif",
                  fontSize: '24px',
                  color: '#c9a24d',
                  marginBottom: '15px',
                }}
              >
                Contact Us
              </h2>

              <div className="contact-item map-bg">
                <FaMapMarkerAlt className="contact-icon" />
                <span>Our Event</span>
              </div>

              <div className="contact-item">
                <FaWhatsapp className="contact-icon" />
                <span>+49 176 20730425</span>
              </div>

              <div className="contact-item">
                <FaEnvelope className="contact-icon" />
                <span>Tataislem@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="right-container">
            <div className="right-inner-container">
              <form onSubmit={handleSubmit}>
                <h2
                  className="lg-view"
                  style={{
                    fontFamily: "'Mitr', sans-serif",
                    fontSize: '24px',
                    color: '#c9a24d',
                    marginBottom: '15px',
                  }}
                >
                  Get in touch
                </h2>

                <div className="row-inputs">
                  <input
                    type="text"
                    name="name"
                    placeholder="Nom *"
                    value={formData.name}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    name="phone"
                    placeholder="Phone *"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <input
                  type="email"
                  name="email"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={handleChange}
                />

                <textarea
                  name="message"
                  rows="4"
                  placeholder="Message"
                  value={formData.message}
                  onChange={handleChange}
                />

                <button type="submit">Envoyer</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
