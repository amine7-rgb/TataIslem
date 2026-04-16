export const DEFAULT_SERVICE_DURATION_MINUTES = 60;
export const MINIMUM_SCHEDULE_NOTICE_MINUTES = 15;
export const DEFAULT_ADMIN_TIMEZONE = 'Africa/Lagos';

const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DEFAULT_WEEKLY_HOURS = [
  { day: 'monday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'friday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'saturday', enabled: true, startTime: '10:00', endTime: '14:00' },
  { day: 'sunday', enabled: false, startTime: '10:00', endTime: '14:00' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SUPPORTED_SLOT_INTERVALS = [15, 30, 60];
const SUPPORTED_TIMEZONES = ['Africa/Lagos', 'Africa/Tunis', 'Europe/Paris', 'UTC'];

const weekdaySet = new Set(WEEK_DAYS);

const getDefaultWeeklyHours = () =>
  DEFAULT_WEEKLY_HOURS.map((entry) => ({
    day: entry.day,
    enabled: entry.enabled,
    startTime: entry.startTime,
    endTime: entry.endTime,
  }));

const normalizeDateValue = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(String(value || ''));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const normalizeTimeValue = (value, fallbackValue) => {
  const candidate = String(value || '').trim();
  return TIME_PATTERN.test(candidate) ? candidate : fallbackValue;
};

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
};

const getFormatter = (timeZone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const getZonedDateParts = (value, timeZone = DEFAULT_ADMIN_TIMEZONE) => {
  const date = normalizeDateValue(value);

  if (!date) {
    return null;
  }

  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  const hour = Number(parts.hour === '24' ? '00' : parts.hour);
  const minute = Number(parts.minute);

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute,
    weekdayKey: String(parts.weekday || '').trim().toLowerCase(),
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + minute,
  };
};

const roundUpToInterval = (date, intervalMinutes) => {
  const result = new Date(date);
  result.setSeconds(0, 0);

  const currentMinutes = result.getMinutes();
  const remainder = currentMinutes % intervalMinutes;

  if (remainder !== 0) {
    result.setMinutes(currentMinutes + (intervalMinutes - remainder));
  }

  return result;
};

export const buildDefaultAdminAvailability = () => ({
  timezone: DEFAULT_ADMIN_TIMEZONE,
  meetingBufferMinutes: 15,
  slotIntervalMinutes: 30,
  weeklyHours: getDefaultWeeklyHours(),
});

export const normalizeAdminAvailability = (rawAvailability = {}) => {
  const fallbackAvailability = buildDefaultAdminAvailability();
  const rawWeeklyHours = Array.isArray(rawAvailability?.weeklyHours)
    ? rawAvailability.weeklyHours
    : [];

  const weeklyHours = WEEK_DAYS.map((dayKey) => {
    const fallbackDay = fallbackAvailability.weeklyHours.find((entry) => entry.day === dayKey);
    const rawDay = rawWeeklyHours.find((entry) => entry?.day === dayKey);
    const startTime = normalizeTimeValue(rawDay?.startTime, fallbackDay.startTime);
    const endTime = normalizeTimeValue(rawDay?.endTime, fallbackDay.endTime);

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return { ...fallbackDay };
    }

    return {
      day: dayKey,
      enabled: rawDay?.enabled == null ? fallbackDay.enabled : Boolean(rawDay.enabled),
      startTime,
      endTime,
    };
  });

  const timezone = SUPPORTED_TIMEZONES.includes(rawAvailability?.timezone)
    ? rawAvailability.timezone
    : fallbackAvailability.timezone;
  const slotIntervalMinutes = SUPPORTED_SLOT_INTERVALS.includes(
    Number(rawAvailability?.slotIntervalMinutes),
  )
    ? Number(rawAvailability.slotIntervalMinutes)
    : fallbackAvailability.slotIntervalMinutes;
  const meetingBufferMinutes = Number.isFinite(Number(rawAvailability?.meetingBufferMinutes))
    ? Math.min(Math.max(Math.round(Number(rawAvailability.meetingBufferMinutes)), 0), 120)
    : fallbackAvailability.meetingBufferMinutes;

  return {
    timezone,
    slotIntervalMinutes,
    meetingBufferMinutes,
    weeklyHours,
  };
};

export const resolveServiceDurationMinutes = (source) => {
  const candidate = Number(source?.durationMinutes);

  if (!Number.isFinite(candidate)) {
    return DEFAULT_SERVICE_DURATION_MINUTES;
  }

  return Math.min(Math.max(Math.round(candidate), 15), 480);
};

export const buildScheduleSlot = (startValue, durationMinutes = DEFAULT_SERVICE_DURATION_MINUTES) => {
  const startAt = normalizeDateValue(startValue);

  if (!startAt) {
    throw new Error('Please choose a valid date and time');
  }

  if (
    startAt.getTime() <=
    Date.now() + MINIMUM_SCHEDULE_NOTICE_MINUTES * 60 * 1000
  ) {
    throw new Error('Please choose a future date and time');
  }

  const safeDuration = resolveServiceDurationMinutes({ durationMinutes });

  return {
    startAt,
    endAt: new Date(startAt.getTime() + safeDuration * 60 * 1000),
  };
};

export const normalizeAlternativeSlots = (
  rawSlots,
  durationMinutes = DEFAULT_SERVICE_DURATION_MINUTES,
) => {
  if (!Array.isArray(rawSlots)) {
    throw new Error('Please provide at least one alternative date');
  }

  const uniqueSlots = new Map();

  rawSlots
    .map((item) => (typeof item === 'string' ? item : item?.startAt))
    .filter(Boolean)
    .forEach((value) => {
      const slot = buildScheduleSlot(value, durationMinutes);
      uniqueSlots.set(slot.startAt.getTime(), slot);
    });

  return [...uniqueSlots.values()].sort(
    (left, right) => left.startAt.getTime() - right.startAt.getTime(),
  );
};

export const findMatchingSlot = (rawSlots, selectedStartAt) => {
  const selectedDate = normalizeDateValue(selectedStartAt);

  if (!selectedDate) {
    return null;
  }

  return (rawSlots || []).find((slot) => {
    const slotStart = normalizeDateValue(slot?.startAt);
    return slotStart && slotStart.getTime() === selectedDate.getTime();
  });
};

export const getServiceOrderCalendarSlot = (order) =>
  order?.currentSlot?.startAt ? order.currentSlot : order?.requestedSlot || null;

export const formatScheduleWindow = (slot, locale = 'fr-FR') => {
  if (!slot?.startAt) {
    return 'To be confirmed';
  }

  const startAt = normalizeDateValue(slot.startAt);
  const endAt =
    normalizeDateValue(slot.endAt) ||
    new Date(
      startAt.getTime() +
        resolveServiceDurationMinutes({ durationMinutes: slot?.durationMinutes }) *
          60 *
          1000,
    );

  return `${startAt.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} • ${startAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endAt.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export const isSlotWithinAvailability = (slot, rawAvailability) => {
  if (!slot?.startAt || !slot?.endAt) {
    return false;
  }

  const availability = normalizeAdminAvailability(rawAvailability);
  const startParts = getZonedDateParts(slot.startAt, availability.timezone);
  const endParts = getZonedDateParts(slot.endAt, availability.timezone);
  const endBoundaryParts = getZonedDateParts(
    new Date(new Date(slot.endAt).getTime() - 1),
    availability.timezone,
  );

  if (!startParts || !endParts || !endBoundaryParts) {
    return false;
  }

  if (startParts.dayKey !== endBoundaryParts.dayKey) {
    return false;
  }

  const dayAvailability = availability.weeklyHours.find(
    (entry) => entry.day === startParts.weekdayKey,
  );

  if (!dayAvailability?.enabled) {
    return false;
  }

  return (
    startParts.minutes >= timeToMinutes(dayAvailability.startTime) &&
    endParts.minutes <= timeToMinutes(dayAvailability.endTime)
  );
};

export const doesSlotConflictWithOrders = (
  slot,
  orders,
  {
    excludeOrderId = null,
    statuses = ['confirmed'],
    bufferMinutes = 0,
  } = {},
) => {
  const slotStart = normalizeDateValue(slot?.startAt);
  const slotEnd = normalizeDateValue(slot?.endAt);

  if (!slotStart || !slotEnd) {
    return false;
  }

  return (orders || []).some((order) => {
    if (!order) {
      return false;
    }

    if (excludeOrderId && String(order._id) === String(excludeOrderId)) {
      return false;
    }

    if (statuses.length > 0 && !statuses.includes(order.scheduleStatus)) {
      return false;
    }

    const orderSlot = getServiceOrderCalendarSlot(order);
    const orderStart = normalizeDateValue(orderSlot?.startAt);
    const orderEnd = normalizeDateValue(orderSlot?.endAt);

    if (!orderStart || !orderEnd) {
      return false;
    }

    const bufferMs = bufferMinutes * 60 * 1000;

    return (
      slotStart.getTime() < orderEnd.getTime() + bufferMs &&
      slotEnd.getTime() > orderStart.getTime() - bufferMs
    );
  });
};

export const generateSuggestedAlternativeSlots = ({
  baseStartAt,
  durationMinutes = DEFAULT_SERVICE_DURATION_MINUTES,
  rawAvailability,
  orders = [],
  excludeOrderId = null,
  maxSuggestions = 3,
}) => {
  const availability = normalizeAdminAvailability(rawAvailability);
  const safeDuration = resolveServiceDurationMinutes({ durationMinutes });
  const suggestions = [];
  const seenKeys = new Set();
  let cursor = roundUpToInterval(
    new Date(
      Math.max(
        normalizeDateValue(baseStartAt)?.getTime() || Date.now(),
        Date.now() + MINIMUM_SCHEDULE_NOTICE_MINUTES * 60 * 1000,
      ),
    ),
    availability.slotIntervalMinutes,
  );
  let attempts = 0;

  while (suggestions.length < maxSuggestions && attempts < 5000) {
    attempts += 1;

    const slot = {
      startAt: new Date(cursor),
      endAt: new Date(cursor.getTime() + safeDuration * 60 * 1000),
    };
    const slotKey = slot.startAt.toISOString();

    if (
      !seenKeys.has(slotKey) &&
      isSlotWithinAvailability(slot, availability) &&
      !doesSlotConflictWithOrders(slot, orders, {
        excludeOrderId,
        statuses: ['confirmed'],
        bufferMinutes: availability.meetingBufferMinutes,
      })
    ) {
      suggestions.push(slot);
      seenKeys.add(slotKey);
    }

    cursor = new Date(cursor.getTime() + availability.slotIntervalMinutes * 60 * 1000);
  }

  return suggestions;
};

export const validateWeeklyHoursShape = (rawWeeklyHours) => {
  if (!Array.isArray(rawWeeklyHours) || rawWeeklyHours.length !== WEEK_DAYS.length) {
    return false;
  }

  return rawWeeklyHours.every((entry) => {
    return (
      entry &&
      typeof entry === 'object' &&
      weekdaySet.has(entry.day) &&
      typeof entry.enabled === 'boolean' &&
      TIME_PATTERN.test(String(entry.startTime || '')) &&
      TIME_PATTERN.test(String(entry.endTime || '')) &&
      timeToMinutes(entry.startTime) < timeToMinutes(entry.endTime)
    );
  });
};
