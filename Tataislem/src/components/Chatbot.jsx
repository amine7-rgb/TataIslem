import { useState, useRef, useEffect } from 'react';
import { QUESTIONS } from '../data/chatbotQuestions';

export default function Chatbot({ close }) {
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hi 👋 Choose a question below:' },
    { type: 'questions' },
  ]);

  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const timeoutsRef = useRef([]);

  const scrollBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(scrollBottom, [messages, typing]);

  useEffect(() => clearTimers, []);

  const [dark, setDark] = useState(localStorage.getItem('chat-theme') === 'dark');

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('chat-theme', next ? 'dark' : 'light');
  };

  const resetChat = () => {
    clearTimers();
    setMessages([
      { type: 'bot', text: 'Conversation restarted ✨ Choose a question:' },
      { type: 'questions' },
    ]);
  };

  const askQuestion = async (q) => {
    if (!q?.key || typing) return;

    clearTimers();

    setMessages((m) => [
      ...m.filter((msg) => msg.type !== 'questions'),
      { type: 'user', text: q.label },
    ]);

    setTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: q.key }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      if (!data?.answer) throw new Error();

      const t = setTimeout(() => {
        setTyping(false);

        let text = '';
        const full = data.answer.join(' ');

        if (full.includes('[SCROLL:events]')) {
          document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
        }

        if (full.includes('[SCROLL:contact]')) {
          document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
        }
        if (full.includes('[SCROLL:services]')) {
          document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        }

        if (full.includes('[SCROLL:about]')) {
          document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
        }

        if (full.includes('[OPEN:booking]')) {
          document.getElementById('floating-button')?.click();
        }

        full.split('').forEach((char, i) => {
          const timer = setTimeout(() => {
            text += char;

            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.type === 'bot') {
                return [...m.slice(0, -1), { type: 'bot', text }];
              }
              return [...m, { type: 'bot', text }];
            });
          }, i * 25);

          timeoutsRef.current.push(timer);
        });

        const endTimer = setTimeout(
          () => {
            setMessages((m) => [
              ...m,
              { type: 'bot', text: 'Choose another question 👇' },
              { type: 'questions' },
            ]);
          },
          full.length * 25 + 400,
        );

        timeoutsRef.current.push(endTimer);
      }, 900);

      timeoutsRef.current.push(t);
    } catch {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { type: 'bot', text: '⚠️ Something went wrong. Try again.' },
        { type: 'questions' },
      ]);
    }
  };

  return (
    <div className={`chatbox ${dark ? 'dark' : ''}`}>
      <div className="chat-header">
        <div className="header-left">
          <img src="/bot-avatar.jpg" alt="bot" />
          <span>Islem Assistant</span>
        </div>

        <div className="header-actions">
          <button onClick={toggleTheme}>🌙</button>
          <button onClick={resetChat}>🔄</button>
          <button onClick={close}>✕</button>
        </div>
      </div>

      <div className="messages">
        {messages.map((m, i) => {
          if (m.type === 'questions') return null;
          return (
            <div key={i} className={`bubble ${m.type}`}>
              {m.text}
            </div>
          );
        })}

        {typing && (
          <div className="bubble bot">
            <div className="typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="question-bar">
        {QUESTIONS.map((q) => (
          <button
            key={q.id}
            disabled={typing}
            onClick={() => askQuestion({ key: q.key, label: q.label })}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
