import { useState } from 'react';
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiExternalLink,
  FiLink,
  FiRefreshCw,
  FiSend,
  FiUser,
  FiVideo,
  FiXCircle,
} from 'react-icons/fi';

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const fullDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});

const syncDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const availabilityDayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const resolveStatusMeta = (status, mode = 'user') => {
  if (status === 'pending_admin_confirmation') {
    return {
      label: 'Waiting for admin confirmation',
      tone: 'is-pending',
    };
  }

  if (status === 'pending_client_selection') {
    return {
      label:
        mode === 'admin'
          ? 'Waiting for client date choice'
          : 'Waiting for your new date choice',
      tone: 'is-attention',
    };
  }

  if (status === 'confirmed') {
    return {
      label: 'Confirmed meeting',
      tone: 'is-confirmed',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'Cancelled',
      tone: 'is-muted',
    };
  }

  return {
    label: 'Payment pending',
    tone: 'is-muted',
  };
};

const toDayKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
};

const dayKeyToDate = (dayKey) => {
  const [year, month, day] = String(dayKey || '')
    .split('-')
    .map((item) => Number(item));

  return new Date(year, (month || 1) - 1, day || 1);
};

const buildMonthMatrix = (visibleMonthDate) => {
  const monthStart = new Date(
    visibleMonthDate.getFullYear(),
    visibleMonthDate.getMonth(),
    1,
  );
  const startDayIndex = (monthStart.getDay() + 6) % 7;
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - startDayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);

    return day;
  });
};

const getDisplaySlot = (appointment) =>
  appointment?.currentSlot?.startAt
    ? appointment.currentSlot
    : appointment?.requestedSlot || null;

const formatSlotTime = (slot) => {
  if (!slot?.startAt) {
    return 'Time to be confirmed';
  }

  const startAt = new Date(slot.startAt);
  const endAt = new Date(slot.endAt || slot.startAt);

  return `${shortTimeFormatter.format(startAt)} - ${shortTimeFormatter.format(endAt)}`;
};

// eslint-disable-next-line no-unused-vars
const formatSlotDateTime = (slot) => {
  if (!slot?.startAt) {
    return 'Date to be confirmed';
  }

  const startAt = new Date(slot.startAt);

  return `${fullDateFormatter.format(startAt)} • ${formatSlotTime(slot)}`;
};

const formatCalendarSlotDateTime = (slot) => {
  if (!slot?.startAt) {
    return 'Date to be confirmed';
  }

  const startAt = new Date(slot.startAt);

  return `${fullDateFormatter.format(startAt)} | ${formatSlotTime(slot)}`;
};

const toDateTimeInputValue = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const buildDefaultProposalSlots = (appointment) => {
  const baseDate = appointment?.currentSlot?.startAt
    ? new Date(appointment.currentSlot.startAt)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  return [1, 2, 3].map((dayOffset) => {
    const proposal = new Date(baseDate);
    proposal.setDate(baseDate.getDate() + dayOffset);
    return toDateTimeInputValue(proposal);
  });
};

export default function ServiceCalendarSection({
  mode = 'user',
  appointments = [],
  busyOrderId = '',
  googleCalendarStatus = null,
  googleCalendarBusy = false,
  availabilityDraft = null,
  availabilitySaving = false,
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar,
  onAvailabilityChange,
  onSaveAvailability,
  onConfirmAppointment,
  onProposeAlternatives,
  onSelectAlternative,
}) {
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => toDayKey(new Date()));
  const [openProposalId, setOpenProposalId] = useState('');
  const [proposalDrafts, setProposalDrafts] = useState({});

  const calendarAppointments = (appointments || [])
    .filter((appointment) => appointment?.paymentStatus === 'paid')
    .map((appointment) => {
      const displaySlot = getDisplaySlot(appointment);

      if (!displaySlot?.startAt) {
        return null;
      }

      return {
        ...appointment,
        displaySlot,
        dayKey: toDayKey(displaySlot.startAt),
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        new Date(left.displaySlot.startAt).getTime() -
        new Date(right.displaySlot.startAt).getTime(),
    );

  const resolvedSelectedDayKey = calendarAppointments.some(
    (appointment) => appointment.dayKey === selectedDayKey,
  )
    ? selectedDayKey
    : calendarAppointments[0]?.dayKey || toDayKey(new Date());

  const selectedDayAppointments = calendarAppointments.filter(
    (appointment) => appointment.dayKey === resolvedSelectedDayKey,
  );

  const pendingWorkflowAppointments = calendarAppointments.filter((appointment) =>
    mode === 'admin'
      ? appointment.scheduleStatus !== 'confirmed'
      : appointment.scheduleStatus === 'pending_client_selection',
  );

  const monthDays = buildMonthMatrix(visibleMonthDate);

  const openProposalComposer = (appointment) => {
    if (!proposalDrafts[appointment._id]) {
      const suggestedSlots = Array.isArray(appointment?.suggestedAlternativeSlots)
        ? appointment.suggestedAlternativeSlots
        : [];

      setProposalDrafts((currentDrafts) => ({
        ...currentDrafts,
        [appointment._id]: {
          slots:
            suggestedSlots.length > 0
              ? suggestedSlots.map((slot) => toDateTimeInputValue(slot.startAt))
              : buildDefaultProposalSlots(appointment),
          note: '',
        },
      }));
    }

    setOpenProposalId((currentId) =>
      currentId === appointment._id ? '' : appointment._id,
    );
  };

  const updateProposalDraft = (appointmentId, updater) => {
    setProposalDrafts((currentDrafts) => {
      const currentDraft = currentDrafts[appointmentId] || {
        slots: ['', '', ''],
        note: '',
      };

      return {
        ...currentDrafts,
        [appointmentId]: updater(currentDraft),
      };
    });
  };

  return (
    <div className="service-calendar-stack">
      {mode === 'admin' ? (
        <section className="dashboard-card service-sync-card">
          <div className="service-calendar-workflow__head">
            <div>
              <p className="dashboard-section-label">Google Sync</p>
              <h2>Connect Google Calendar to generate Meet links automatically</h2>
              <p>
                After final confirmation, Tata Islem creates a Google Calendar event,
                generates a Google Meet room, and sends the invite to the client for the
                confirmed slot.
              </p>
            </div>

            <span
              className={`service-status-pill ${
                googleCalendarStatus?.connected
                  ? 'is-confirmed'
                  : googleCalendarStatus?.configured
                    ? 'is-attention'
                    : 'is-muted'
              }`}
            >
              {googleCalendarStatus?.connected
                ? 'Connected'
                : googleCalendarStatus?.configured
                  ? 'Ready to connect'
                  : 'Server setup required'}
            </span>
          </div>

          <div className="service-sync-card__body">
            <div className="service-sync-card__details">
              <article className="service-sync-detail">
                <span>Google account</span>
                <strong>
                  {googleCalendarStatus?.connected
                    ? googleCalendarStatus.email
                    : 'No Google account connected yet'}
                </strong>
                <p>
                  {googleCalendarStatus?.connected
                    ? 'This account owns the calendar event and Meet room created during final confirmation.'
                    : 'Connect your admin Google account once to unlock automatic Meet links and Calendar invites.'}
                </p>
              </article>

              <article className="service-sync-detail">
                <span>Calendar target</span>
                <strong>{googleCalendarStatus?.calendarId || 'primary'}</strong>
                <p>
                  {googleCalendarStatus?.connected && googleCalendarStatus?.connectedAt
                    ? `Connected on ${syncDateFormatter.format(
                        new Date(googleCalendarStatus.connectedAt),
                      )}`
                    : 'Use a redirect URI matching the same browser origin you use in local or production.'}
                </p>
              </article>
            </div>

            <div className="service-sync-card__actions">
              <button
                type="button"
                className="dashboard-secondary-button service-action-button is-connect"
                disabled={googleCalendarBusy || !googleCalendarStatus?.configured}
                onClick={onConnectGoogleCalendar}
              >
                <FiLink />
                <span>
                  {googleCalendarBusy
                    ? 'Redirecting...'
                    : googleCalendarStatus?.connected
                      ? 'Reconnect Google Calendar'
                      : 'Connect Google Calendar'}
                </span>
              </button>

              {googleCalendarStatus?.connected ? (
                <button
                  type="button"
                  className="dashboard-secondary-button service-action-button"
                  disabled={googleCalendarBusy}
                  onClick={onDisconnectGoogleCalendar}
                >
                  <FiXCircle />
                  <span>{googleCalendarBusy ? 'Please wait...' : 'Disconnect'}</span>
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {mode === 'admin' && availabilityDraft ? (
        <section className="dashboard-card service-availability-card">
          <div className="service-calendar-workflow__head">
            <div>
              <p className="dashboard-section-label">Working Hours</p>
              <h2>Admin availability used for automatic service proposals</h2>
              <p>
                Confirmations are limited to your working hours, and new alternative slots
                are suggested automatically from this schedule.
              </p>
            </div>
          </div>

          <div className="service-availability-topline">
            <label className="dashboard-field">
              <span>Timezone</span>
              <select
                value={availabilityDraft.timezone}
                onChange={(event) =>
                  onAvailabilityChange?.({
                    ...availabilityDraft,
                    timezone: event.target.value,
                  })
                }
              >
                <option value="Africa/Lagos">Africa/Lagos</option>
                <option value="Africa/Tunis">Africa/Tunis</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="UTC">UTC</option>
              </select>
            </label>

            <label className="dashboard-field">
              <span>Slot interval</span>
              <select
                value={availabilityDraft.slotIntervalMinutes}
                onChange={(event) =>
                  onAvailabilityChange?.({
                    ...availabilityDraft,
                    slotIntervalMinutes: Number(event.target.value),
                  })
                }
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>

            <label className="dashboard-field">
              <span>Buffer between meetings</span>
              <input
                type="number"
                min="0"
                max="120"
                step="5"
                value={availabilityDraft.meetingBufferMinutes}
                onChange={(event) =>
                  onAvailabilityChange?.({
                    ...availabilityDraft,
                    meetingBufferMinutes: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <div className="service-availability-grid">
            {availabilityDraft.weeklyHours.map((entry, index) => (
              <article key={entry.day} className="service-availability-day">
                <div className="service-availability-day__head">
                  <strong>{availabilityDayLabels[entry.day] || entry.day}</strong>
                  <label className="service-availability-switch">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={(event) =>
                        onAvailabilityChange?.({
                          ...availabilityDraft,
                          weeklyHours: availabilityDraft.weeklyHours.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, enabled: event.target.checked }
                                : item,
                          ),
                        })
                      }
                    />
                    <span>{entry.enabled ? 'Open' : 'Closed'}</span>
                  </label>
                </div>

                <div className="service-availability-day__times">
                  <label className="dashboard-field">
                    <span>Start</span>
                    <input
                      type="time"
                      value={entry.startTime}
                      disabled={!entry.enabled}
                      onChange={(event) =>
                        onAvailabilityChange?.({
                          ...availabilityDraft,
                          weeklyHours: availabilityDraft.weeklyHours.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, startTime: event.target.value }
                                : item,
                          ),
                        })
                      }
                    />
                  </label>

                  <label className="dashboard-field">
                    <span>End</span>
                    <input
                      type="time"
                      value={entry.endTime}
                      disabled={!entry.enabled}
                      onChange={(event) =>
                        onAvailabilityChange?.({
                          ...availabilityDraft,
                          weeklyHours: availabilityDraft.weeklyHours.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, endTime: event.target.value }
                                : item,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="auth-submit auth-submit--centered"
            onClick={onSaveAvailability}
            disabled={availabilitySaving}
          >
            {availabilitySaving ? 'Saving hours...' : 'Save working hours'}
          </button>
        </section>
      ) : null}

      <section className="dashboard-card service-calendar-board">
        <div className="service-calendar-board__head">
          <div>
            <p className="dashboard-section-label">Calendar</p>
            <h2>
              {mode === 'admin'
                ? 'Service reservations timeline'
                : 'Your service meeting calendar'}
            </h2>
            <p>
              {mode === 'admin'
                ? 'Confirm a paid request or propose other available slots when your agenda is full.'
                : 'Track your requested meetings, confirmed appointments, and any alternative dates sent by the admin.'}
            </p>
          </div>

          <div className="service-calendar-board__summary">
            <div className="service-calendar-summary-pill">
              <FiCalendar />
              <span>{calendarAppointments.length} scheduled entries</span>
            </div>
            <div className="service-calendar-summary-pill">
              <FiClock />
              <span>{pendingWorkflowAppointments.length} active workflow items</span>
            </div>
          </div>
        </div>

        <div className="service-calendar-layout">
          <div className="service-calendar-grid-card">
            <div className="service-calendar-toolbar">
              <button
                type="button"
                className="service-calendar-nav"
                onClick={() =>
                  setVisibleMonthDate(
                    new Date(
                      visibleMonthDate.getFullYear(),
                      visibleMonthDate.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                <FiChevronLeft />
              </button>

              <strong>{monthFormatter.format(visibleMonthDate)}</strong>

              <button
                type="button"
                className="service-calendar-nav"
                onClick={() =>
                  setVisibleMonthDate(
                    new Date(
                      visibleMonthDate.getFullYear(),
                      visibleMonthDate.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                <FiChevronRight />
              </button>
            </div>

            <div className="service-calendar-weekdays">
              {weekdayLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="service-calendar-grid">
              {monthDays.map((day) => {
                const dayKey = toDayKey(day);
                const dayAppointments = calendarAppointments.filter(
                  (appointment) => appointment.dayKey === dayKey,
                );
                const isCurrentMonth = day.getMonth() === visibleMonthDate.getMonth();
                const isSelected = dayKey === resolvedSelectedDayKey;
                const isToday = dayKey === toDayKey(new Date());

                return (
                  <button
                    key={dayKey}
                    type="button"
                    className={`service-calendar-cell ${
                      isCurrentMonth ? '' : 'is-outside'
                    } ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                    onClick={() => setSelectedDayKey(dayKey)}
                  >
                    <span className="service-calendar-cell__day">{day.getDate()}</span>
                    <div className="service-calendar-cell__markers">
                      {dayAppointments.slice(0, 3).map((appointment) => (
                        <span
                          key={`${appointment._id}-${appointment.scheduleStatus}`}
                          className={`service-calendar-marker ${
                            resolveStatusMeta(appointment.scheduleStatus, mode)?.tone ||
                            'is-muted'
                          }`}
                        />
                      ))}
                    </div>
                    {dayAppointments.length > 0 ? (
                      <small>{dayAppointments.length} item(s)</small>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="service-calendar-agenda">
            <div className="service-calendar-agenda__head">
              <span>Selected date</span>
              <strong>
                {fullDateFormatter.format(dayKeyToDate(resolvedSelectedDayKey))}
              </strong>
            </div>

            {selectedDayAppointments.length ? (
              <div className="service-calendar-agenda__list">
                {selectedDayAppointments.map((appointment) => {
                  const meta = resolveStatusMeta(appointment.scheduleStatus, mode);

                  return (
                    <article
                      key={appointment._id}
                      className="service-calendar-agenda__item"
                    >
                      <div className="service-calendar-agenda__item-head">
                        <div>
                          <h3>{appointment.serviceTitle}</h3>
                          <p>{formatSlotTime(appointment.displaySlot)}</p>
                        </div>
                        <span className={`service-status-pill ${meta.tone}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="service-calendar-agenda__meta">
                        <span>
                          <FiUser />
                          {mode === 'admin'
                            ? appointment.fullName
                            : 'Meeting under your client account'}
                        </span>
                        <span>{appointment.email}</span>
                      </div>

                      {appointment.scheduleNote ? (
                        <p className="service-calendar-agenda__note">
                          {appointment.scheduleNote}
                        </p>
                      ) : null}

                      {appointment.scheduleStatus === 'confirmed' &&
                      (appointment.meetingUrl || appointment.googleCalendarHtmlLink) ? (
                        <div className="service-calendar-agenda__links">
                          {appointment.meetingUrl ? (
                            <a
                              href={appointment.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="dashboard-secondary-button service-inline-link"
                            >
                              <FiVideo />
                              <span>
                                {mode === 'admin' ? 'Open Meet room' : 'Join meeting'}
                              </span>
                            </a>
                          ) : null}

                          {appointment.googleCalendarHtmlLink ? (
                            <a
                              href={appointment.googleCalendarHtmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="dashboard-secondary-button service-inline-link"
                            >
                              <FiExternalLink />
                              <span>Open calendar event</span>
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="service-calendar-empty">
                <FiCalendar />
                <p>
                  {mode === 'admin'
                    ? 'No service meeting is attached to this date yet.'
                    : 'No service meeting appears on this day yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-card service-calendar-workflow">
        <div className="service-calendar-workflow__head">
          <div>
            <p className="dashboard-section-label">
              {mode === 'admin' ? 'Workflow Actions' : 'Your Pending Actions'}
            </p>
            <h2>
              {mode === 'admin'
                ? 'Manage each paid service request'
                : 'Choose a new date when the admin sends alternatives'}
            </h2>
          </div>
        </div>

        {pendingWorkflowAppointments.length ? (
          <div className="service-calendar-workflow__list">
            {pendingWorkflowAppointments.map((appointment) => {
              const meta = resolveStatusMeta(appointment.scheduleStatus, mode);
              const proposalDraft = proposalDrafts[appointment._id] || {
                slots: ['', '', ''],
                note: '',
              };

              return (
                <article key={appointment._id} className="service-workflow-card">
                  <div className="service-workflow-card__head">
                    <div>
                      <h3>{appointment.serviceTitle}</h3>
                      <p>{formatCalendarSlotDateTime(appointment.displaySlot)}</p>
                    </div>

                    <span className={`service-status-pill ${meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="service-workflow-card__meta">
                    <span>
                      <FiUser />
                      {appointment.fullName}
                    </span>
                    <span>{appointment.email}</span>
                  </div>

                  {appointment.scheduleNote ? (
                    <p className="service-workflow-card__note">
                      {appointment.scheduleNote}
                    </p>
                  ) : null}

                  {mode === 'admin' ? (
                    <div className="service-workflow-card__actions">
                      {appointment.scheduleStatus === 'pending_admin_confirmation' ? (
                        <button
                          type="button"
                          className="dashboard-secondary-button service-action-button is-confirm"
                          disabled={busyOrderId === appointment._id}
                          onClick={() => onConfirmAppointment?.(appointment._id)}
                        >
                          <FiCheckCircle />
                          <span>
                            {busyOrderId === appointment._id
                              ? 'Saving...'
                              : 'Confirm this date'}
                          </span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="dashboard-secondary-button service-action-button"
                        disabled={busyOrderId === appointment._id}
                        onClick={() => openProposalComposer(appointment)}
                      >
                        <FiRefreshCw />
                        <span>
                          {openProposalId === appointment._id
                            ? 'Hide alternatives'
                            : 'Propose other dates'}
                        </span>
                      </button>
                    </div>
                  ) : null}

                  {mode === 'admin' && openProposalId === appointment._id ? (
                    <div className="service-proposal-form">
                      {appointment.suggestedAlternativeSlots?.length ? (
                        <div className="service-proposal-autofill">
                          <p>Automatic suggestions from your working hours:</p>
                          <div className="service-choice-list">
                            {appointment.suggestedAlternativeSlots.map(
                              (slot, slotIndex) => (
                                <button
                                  key={`${appointment._id}-${slot.startAt}-fill`}
                                  type="button"
                                  className="service-choice-button"
                                  onClick={() =>
                                    updateProposalDraft(appointment._id, (draft) => {
                                      const nextSlots = [...draft.slots];
                                      nextSlots[slotIndex] = toDateTimeInputValue(
                                        slot.startAt,
                                      );

                                      return {
                                        ...draft,
                                        slots: nextSlots,
                                      };
                                    })
                                  }
                                >
                                  <FiCalendar />
                                  <span>{formatCalendarSlotDateTime(slot)}</span>
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      ) : null}

                      {[0, 1, 2].map((slotIndex) => (
                        <label
                          key={`${appointment._id}-${slotIndex}`}
                          className="dashboard-field"
                        >
                          <span>Alternative slot {slotIndex + 1}</span>
                          <input
                            type="datetime-local"
                            value={proposalDraft.slots[slotIndex] || ''}
                            onChange={(event) =>
                              updateProposalDraft(appointment._id, (draft) => {
                                const nextSlots = [...draft.slots];
                                nextSlots[slotIndex] = event.target.value;

                                return {
                                  ...draft,
                                  slots: nextSlots,
                                };
                              })
                            }
                          />
                        </label>
                      ))}

                      <label className="dashboard-field">
                        <span>Admin note</span>
                        <textarea
                          rows="3"
                          value={proposalDraft.note}
                          onChange={(event) =>
                            updateProposalDraft(appointment._id, (draft) => ({
                              ...draft,
                              note: event.target.value,
                            }))
                          }
                          placeholder="Optional explanation for the client"
                        />
                      </label>

                      <button
                        type="button"
                        className="auth-submit auth-submit--centered"
                        disabled={busyOrderId === appointment._id}
                        onClick={() =>
                          onProposeAlternatives?.(
                            appointment._id,
                            proposalDraft.slots
                              .filter(Boolean)
                              .map((value) => new Date(value).toISOString()),
                            proposalDraft.note,
                          )
                        }
                      >
                        <FiSend />
                        <span>
                          {busyOrderId === appointment._id
                            ? 'Sending...'
                            : 'Send new available dates'}
                        </span>
                      </button>
                    </div>
                  ) : null}

                  {mode === 'user' &&
                  appointment.scheduleStatus === 'pending_client_selection' ? (
                    <div className="service-choice-list">
                      {(appointment.alternativeSlots || []).map((slot) => (
                        <button
                          key={slot.startAt}
                          type="button"
                          className="service-choice-button"
                          disabled={busyOrderId === appointment._id}
                          onClick={() =>
                            onSelectAlternative?.(appointment._id, slot.startAt)
                          }
                        >
                          <FiClock />
                          <span>{formatCalendarSlotDateTime(slot)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="service-calendar-empty service-calendar-empty--soft">
            <FiCheckCircle />
            <p>
              {mode === 'admin'
                ? 'No pending service scheduling action right now.'
                : 'No new date needs your attention right now.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
