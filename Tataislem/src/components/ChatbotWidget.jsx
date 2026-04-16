import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import Chatbot from './Chatbot';

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const whatsappHref =
    'https://wa.me/4917620730425?text=Hello%20Tata%20Islem%2C%20I%20would%20like%20to%20book%20my%20free%20introductory%20call.';

  return (
    <div className="floating-support-stack">
      <a
        href={whatsappHref}
        className="floating-support-cta"
        target="_blank"
        rel="noreferrer"
        aria-label="Start your free WhatsApp call with the admin"
      >
        <span className="floating-support-cta__icon">
          <FaWhatsapp />
        </span>
        <span className="floating-support-cta__copy">
          <strong>Free intro call</strong>
          <small>Chat on WhatsApp with Islem</small>
        </span>
      </a>

      <button
        type="button"
        className="chatbot-avatar-btn"
        onClick={() => setOpen(!open)}
        aria-label="Open chatbot"
      >
        <img src="/bot-avatar.jpg" alt="Chatbot avatar" />
      </button>

      {open && (
        <div className="chatbot-popup">
          <Chatbot close={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
