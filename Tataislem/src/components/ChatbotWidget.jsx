import { useState } from 'react';
import Chatbot from './Chatbot';

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
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
    </>
  );
}
