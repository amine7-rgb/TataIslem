export const getAnswer = (req, res) => {
  const key = req.body?.key?.trim();
  console.log('KEY RECEIVED:', key);
  const answers = {
    about: [
      'This is executive-level identity recalibration for leaders whose presence impacts revenue and reputation.',
      'We align internal authority with external influence  refining positioning.',
      'message, and stage power at the root. The result: leaders who command rooms.',
      'attract premium opportunities, and elevate company perception at scale.',
      '[SCROLL:about]',
    ],

    services: [
      'We offer four premium coaching services:',
      'Clarity Coaching — helping you understand your path and remove mental fog.',
      'Emotional Healing — releasing past weight and emotional blocks.',
      'Life Direction — building strong purpose and decision confidence.',
      'Spiritual Growth — reconnecting with your inner balance and energy.',
      '[SCROLL:services]',
    ],

    events: [
      'Our events are executive-level transformation experiences.',
      'We design immersive leadership gatherings that recalibrate identity and influence in real time.',
      'Hundreds of leaders and teams have already experienced measurable internal and cultural shifts.',
      'Each event restructures presence, decision-making, and collective performance at the root.',
      '🔥 DISCOVER OUR EVENTS NOW 🔥',
      '[SCROLL:events]',
    ],

    contact: [
      'You can reach us easily through our contact section.',
      'Send any question, request, or message — we respond personally.',
      'We are here to guide you step by step.',
      '[SCROLL:contact]',
    ],

    book: [
      'To book your seat, visit our events section.',
      'You will access premium experiences and guided sessions.',
      'Reserve early to secure the best spot.',
      '[OPEN:booking]',
    ],
  };

  if (!key || !answers[key]) {
    console.log('⚠️ fallback triggered, key =', key);

    return res.json({
      answer: ['Sorry, I didn’t catch that.', 'Please choose a question below 👇'],
    });
  }

  res.json({ answer: answers[key] });
};
