import Contact from '../models/Contact.js';
import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import Review from '../models/Review.js';
import Service from '../models/Service.js';
import ServiceOrder from '../models/ServiceOrder.js';
import User from '../models/User.js';
import {
  buildAdminBookingsExportFilename,
  generateAdminBookingsPdf,
  generateAdminBookingsSpreadsheet,
} from '../services/adminBookingsExport.service.js';
import {
  createGoogleCalendarMeeting,
  isGoogleCalendarConfigured,
} from '../services/googleCalendar.service.js';
import {
  generateSuggestedAlternativeSlots,
  isSlotWithinAvailability,
  normalizeAdminAvailability,
  normalizeAlternativeSlots,
  resolveServiceDurationMinutes,
  validateWeeklyHoursShape,
} from '../services/serviceSchedule.service.js';
import { sendServiceScheduleDecisionMail } from '../services/mail.service.js';

const MONTH_WINDOW = 6;
const DEFAULT_BOOKINGS_PAGE = 1;
const DEFAULT_BOOKINGS_LIMIT = 8;
const MAX_BOOKINGS_LIMIT = 40;
const ALLOWED_BOOKING_TYPES = new Set(['all', 'event', 'service']);

const getMonthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

const buildMonthWindow = () => {
  const currentDate = new Date();
  const months = [];

  for (let offset = MONTH_WINDOW - 1; offset >= 0; offset -= 1) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);

    months.push({
      key: getMonthKey(date.getFullYear(), date.getMonth() + 1),
      label: date.toLocaleString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  }

  return months;
};

const mapMonthlyDataset = (months, rows, valueKey = 'count', totalKey = 'totalAmount') => {
  const lookup = new Map(
    rows.map((row) => [getMonthKey(row._id.year, row._id.month), row]),
  );

  return months.map((month) => {
    const row = lookup.get(month.key);

    return {
      label: month.label,
      value: row?.[valueKey] ?? 0,
      total: row?.[totalKey] ?? 0,
    };
  });
};

const groupMonthly = (fieldName, match = {}) => [
  {
    $match: {
      [fieldName]: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) },
      ...match,
    },
  },
  {
    $group: {
      _id: {
        year: { $year: `$${fieldName}` },
        month: { $month: `$${fieldName}` },
      },
      count: { $sum: 1 },
      totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
    },
  },
  {
    $sort: {
      '_id.year': 1,
      '_id.month': 1,
    },
  },
];

const roundPercentage = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

const parsePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsedValue = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(parsedValue, max);
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getBookingTypeFilter = (value) =>
  ALLOWED_BOOKING_TYPES.has(value) ? value : 'all';

const serviceStatusLabels = {
  pending_admin_confirmation: 'Awaiting admin',
  pending_client_selection: 'Awaiting client',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const formatAdminBookingDate = (value) => {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getAdminBookingsPayload = async ({ type = 'all', search = '' }) => {
  const normalizedType = getBookingTypeFilter(type);
  const normalizedSearch = String(search || '').trim();
  const searchRegex = normalizedSearch ? new RegExp(escapeRegex(normalizedSearch), 'i') : null;

  const eventQuery = {};
  const serviceQuery = { paymentStatus: 'paid' };

  if (searchRegex) {
    eventQuery.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phoneNumber: searchRegex },
      { eventTitle: searchRegex },
      { eventAddress: searchRegex },
    ];

    serviceQuery.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phoneNumber: searchRegex },
      { serviceTitle: searchRegex },
      { scheduleNote: searchRegex },
    ];
  }

  const [eventReservations, serviceReservations] = await Promise.all([
    normalizedType === 'service'
      ? []
      : Reservation.find(eventQuery)
          .sort({ createdAt: -1 })
          .select(
            'fullName email phoneNumber eventTitle eventDate eventAddress amount createdAt paymentStatus seats',
          )
          .lean(),
    normalizedType === 'event'
      ? []
      : ServiceOrder.find(serviceQuery)
          .sort({ createdAt: -1 })
          .select(
            'fullName email phoneNumber serviceTitle amount createdAt scheduleStatus currentSlot requestedSlot paymentStatus',
          )
          .lean(),
  ]);

  const eventItems = eventReservations.map((reservation) => ({
    _id: reservation._id.toString(),
    type: 'event',
    typeLabel: 'Event',
    clientName: reservation.fullName,
    email: reservation.email,
    phoneNumber: reservation.phoneNumber,
    bookingTitle: reservation.eventTitle || 'Untitled event',
    statusLabel: 'Paid',
    amount: reservation.amount || 0,
    secondaryLine: reservation.eventDate
      ? `Event date: ${formatAdminBookingDate(reservation.eventDate)}`
      : 'Event date not available',
    scheduledAt: reservation.eventDate || null,
    createdAt: reservation.createdAt,
    location: reservation.eventAddress || '',
  }));

  const serviceItems = serviceReservations.map((reservation) => {
    const scheduledAt =
      reservation.currentSlot?.startAt || reservation.requestedSlot?.startAt || null;

    return {
      _id: reservation._id.toString(),
      type: 'service',
      typeLabel: 'Service',
      clientName: reservation.fullName,
      email: reservation.email,
      phoneNumber: reservation.phoneNumber,
      bookingTitle: reservation.serviceTitle || 'Untitled service',
      statusLabel:
        serviceStatusLabels[reservation.scheduleStatus] || 'Service booked',
      amount: reservation.amount || 0,
      secondaryLine: scheduledAt
        ? `Meeting: ${formatAdminBookingDate(scheduledAt)}`
        : 'Meeting time pending',
      scheduledAt,
      createdAt: reservation.createdAt,
      location: null,
    };
  });

  const items = [...eventItems, ...serviceItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  const uniqueClients = new Set(items.map((item) => item.email.toLowerCase())).size;
  const totalRevenue = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    type: normalizedType,
    search: normalizedSearch,
    items,
    stats: {
      totalBookings: items.length,
      eventReservations: eventItems.length,
      serviceReservations: serviceItems.length,
      uniqueClients,
      totalRevenue,
    },
  };
};

const findManageableServiceOrder = async (orderId) => {
  return await ServiceOrder.findOne({
    _id: orderId,
    paymentStatus: 'paid',
  });
};

const hasScheduleConflict = async (
  orderId,
  slot,
  bufferMinutes = 0,
) => {
  if (!slot?.startAt || !slot?.endAt) {
    return false;
  }

  const bufferMs = bufferMinutes * 60 * 1000;

  return await ServiceOrder.exists({
    _id: { $ne: orderId },
    paymentStatus: 'paid',
    scheduleStatus: 'confirmed',
    'currentSlot.startAt': { $lt: new Date(new Date(slot.endAt).getTime() + bufferMs) },
    'currentSlot.endAt': { $gt: new Date(new Date(slot.startAt).getTime() - bufferMs) },
  });
};

export const getAdminBookings = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, DEFAULT_BOOKINGS_PAGE);
    const limit = parsePositiveInteger(
      req.query.limit,
      DEFAULT_BOOKINGS_LIMIT,
      MAX_BOOKINGS_LIMIT,
    );
    const payload = await getAdminBookingsPayload({
      type: req.query.type,
      search: req.query.search,
    });

    const totalPages = Math.max(1, Math.ceil(payload.items.length / limit));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * limit;
    const paginatedItems = payload.items.slice(startIndex, startIndex + limit);

    return res.json({
      items: paginatedItems,
      stats: payload.stats,
      filters: {
        type: payload.type,
        search: payload.search,
      },
      pagination: {
        page: currentPage,
        limit,
        totalItems: payload.items.length,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load bookings overview' });
  }
};

export const exportAdminBookings = async (req, res) => {
  try {
    const format = req.query.format === 'pdf' ? 'pdf' : 'xls';
    const payload = await getAdminBookingsPayload({
      type: req.query.type,
      search: req.query.search,
    });

    const title =
      payload.type === 'event'
        ? 'Event reservations'
        : payload.type === 'service'
          ? 'Service reservations'
          : 'All reservations';
    const filename = buildAdminBookingsExportFilename({
      type: payload.type,
      format,
    });

    const fileBuffer =
      format === 'pdf'
        ? await generateAdminBookingsPdf({
            items: payload.items,
            stats: payload.stats,
            title,
          })
        : generateAdminBookingsSpreadsheet({
            items: payload.items,
            stats: payload.stats,
            title,
          });

    res.setHeader(
      'Content-Type',
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.ms-excel; charset=utf-8',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(fileBuffer);
  } catch {
    return res.status(500).json({ error: 'Unable to export bookings report' });
  }
};

export const getAdminOverview = async (_req, res) => {
  try {
    const now = new Date();
    const monthWindow = buildMonthWindow();
    const adminAvailability = normalizeAdminAvailability(_req.user?.adminAvailability);
    const googleCalendarStatus = {
      configured: isGoogleCalendarConfigured(),
      connected: Boolean(_req.user?.googleCalendar?.refreshTokenEncrypted),
      email: _req.user?.googleCalendar?.email || null,
      calendarId: _req.user?.googleCalendar?.calendarId || 'primary',
      connectedAt: _req.user?.googleCalendar?.connectedAt || null,
    };

    const [
      usersCount,
      adminsCount,
      verifiedUsersCount,
      eventsCount,
      servicesCount,
      reservationsCount,
      paidServiceOrdersCount,
      pendingAdminServiceCount,
      pendingClientServiceCount,
      contactsCount,
      reviewsCount,
      upcomingEventsCount,
      activeEventsCount,
      soldOutEventsCount,
      recentUsers,
      recentReservations,
      recentServiceOrders,
      recentContacts,
      recentReviews,
      serviceScheduleOrders,
      reservationMonthlyRows,
      serviceOrderMonthlyRows,
      contactMonthlyRows,
      eventRevenueResult,
      serviceRevenueResult,
      seatsResult,
      topEventsResult,
      topServicesResult,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user', emailVerified: true }),
      Event.countDocuments(),
      Service.countDocuments(),
      Reservation.countDocuments(),
      ServiceOrder.countDocuments({ paymentStatus: 'paid' }),
      ServiceOrder.countDocuments({
        paymentStatus: 'paid',
        scheduleStatus: 'pending_admin_confirmation',
      }),
      ServiceOrder.countDocuments({
        paymentStatus: 'paid',
        scheduleStatus: 'pending_client_selection',
      }),
      Contact.countDocuments(),
      Review.countDocuments(),
      Event.countDocuments({ date: { $gte: now } }),
      Event.countDocuments({ date: { $gte: now }, availableSeats: { $gt: 0 } }),
      Event.countDocuments({ availableSeats: 0 }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email role emailVerified createdAt'),
      Reservation.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fullName email eventTitle amount createdAt'),
      ServiceOrder.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fullName email serviceTitle amount paymentStatus createdAt'),
      Contact.find().sort({ createdAt: -1 }).limit(5).select('name email phone createdAt'),
      Review.find()
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .populate('userId', 'firstName lastName avatarUrl')
        .select('userId headline text rating createdAt updatedAt'),
      ServiceOrder.find({ paymentStatus: 'paid' })
        .sort({ 'currentSlot.startAt': 1, createdAt: -1 })
        .select(
          'fullName email phoneNumber serviceTitle paymentStatus scheduleStatus scheduleNote durationMinutes requestedSlot currentSlot alternativeSlots createdAt confirmedAt lastScheduleUpdateAt meetingUrl meetingProvider googleCalendarEventId googleCalendarHtmlLink',
        )
        .lean(),
      Reservation.aggregate(groupMonthly('createdAt')),
      ServiceOrder.aggregate(groupMonthly('createdAt', { paymentStatus: 'paid' })),
      Contact.aggregate(groupMonthly('createdAt')),
      Reservation.aggregate([
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ]),
      ServiceOrder.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ]),
      Event.aggregate([
        {
          $group: {
            _id: null,
            totalSeats: { $sum: { $ifNull: ['$totalSeats', 0] } },
            availableSeats: { $sum: { $ifNull: ['$availableSeats', 0] } },
          },
        },
      ]),
      Reservation.aggregate([
        {
          $group: {
            _id: '$eventTitle',
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$amount', 0] } },
          },
        },
        { $sort: { count: -1, revenue: -1 } },
        { $limit: 4 },
      ]),
      ServiceOrder.aggregate([
        { $match: { paymentStatus: 'paid' } },
        {
          $group: {
            _id: '$serviceTitle',
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$amount', 0] } },
          },
        },
        { $sort: { count: -1, revenue: -1 } },
        { $limit: 4 },
      ]),
    ]);

    const clientUsersCount = Math.max(usersCount - adminsCount, 0);
    const unverifiedUsersCount = Math.max(clientUsersCount - verifiedUsersCount, 0);
    const eventRevenue = eventRevenueResult[0]?.total ?? 0;
    const serviceRevenue = serviceRevenueResult[0]?.total ?? 0;
    const totalRevenue = eventRevenue + serviceRevenue;
    const totalTransactions = reservationsCount + paidServiceOrdersCount;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const totalSeats = seatsResult[0]?.totalSeats ?? 0;
    const availableSeats = seatsResult[0]?.availableSeats ?? 0;
    const soldSeats = Math.max(totalSeats - availableSeats, 0);
    const occupancyRate = totalSeats > 0 ? roundPercentage((soldSeats / totalSeats) * 100) : 0;
    const verificationRate =
      clientUsersCount > 0 ? roundPercentage((verifiedUsersCount / clientUsersCount) * 100) : 0;

    const reservationTrend = mapMonthlyDataset(monthWindow, reservationMonthlyRows);
    const serviceOrderTrend = mapMonthlyDataset(monthWindow, serviceOrderMonthlyRows);
    const contactTrend = mapMonthlyDataset(monthWindow, contactMonthlyRows);

    const activityTrend = monthWindow.map((month, index) => ({
      label: month.label,
      reservations: reservationTrend[index]?.value ?? 0,
      serviceOrders: serviceOrderTrend[index]?.value ?? 0,
      contacts: contactTrend[index]?.value ?? 0,
      revenue: (reservationTrend[index]?.total ?? 0) + (serviceOrderTrend[index]?.total ?? 0),
    }));

    const serviceScheduleOrdersWithSuggestions = serviceScheduleOrders.map((order) => ({
      ...order,
      suggestedAlternativeSlots:
        order.scheduleStatus === 'confirmed'
          ? []
          : generateSuggestedAlternativeSlots({
              baseStartAt: order.currentSlot?.startAt || order.requestedSlot?.startAt || now,
              durationMinutes: resolveServiceDurationMinutes(order),
              rawAvailability: adminAvailability,
              orders: serviceScheduleOrders,
              excludeOrderId: order._id,
            }),
    }));

    return res.json({
      stats: {
        usersCount,
        eventsCount,
        servicesCount,
        reservationsCount,
        serviceOrdersCount: paidServiceOrdersCount,
        contactsCount,
        reviewsCount,
      },
      analytics: {
        kpis: {
          totalRevenue,
          averageOrderValue,
          verificationRate,
          occupancyRate,
          upcomingEventsCount,
          activeEventsCount,
          soldOutEventsCount,
          totalTransactions,
          verifiedUsersCount,
          unverifiedUsersCount,
          soldSeats,
          pendingAdminServiceCount,
          pendingClientServiceCount,
        },
        activityTrend,
        revenueSplit: [
          { label: 'Events', value: eventRevenue },
          { label: 'Services', value: serviceRevenue },
        ],
        audienceSplit: [
          { label: 'Verified clients', value: verifiedUsersCount },
          { label: 'Pending verification', value: unverifiedUsersCount },
          { label: 'Admins', value: adminsCount },
        ],
        interactionMix: [
          { label: 'Event bookings', value: reservationsCount },
          { label: 'Service orders', value: paidServiceOrdersCount },
          { label: 'Contact leads', value: contactsCount },
        ],
        topEvents: topEventsResult.map((item) => ({
          label: item._id || 'Untitled event',
          value: item.count,
          revenue: item.revenue,
        })),
        topServices: topServicesResult.map((item) => ({
          label: item._id || 'Untitled service',
          value: item.count,
          revenue: item.revenue,
        })),
      },
      recentUsers,
      recentReservations,
      recentServiceOrders,
      recentContacts,
      recentReviews,
      serviceScheduleOrders: serviceScheduleOrdersWithSuggestions,
      adminAvailability,
      googleCalendarStatus,
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load admin overview' });
  }
};

export const confirmServiceSchedule = async (req, res) => {
  try {
    const { orderId } = req.params;
    const note = String(req.body?.note || '').trim();
    const order = await findManageableServiceOrder(orderId);
    const adminAvailability = normalizeAdminAvailability(req.user?.adminAvailability);

    if (!order) {
      return res.status(404).json({ error: 'Service reservation not found' });
    }

    if (!order.currentSlot?.startAt) {
      return res.status(400).json({ error: 'This reservation has no selected meeting time yet' });
    }

    if (order.scheduleStatus !== 'pending_admin_confirmation') {
      return res.status(409).json({
        error: 'Only reservations waiting for admin confirmation can be confirmed',
      });
    }

    if (!isSlotWithinAvailability(order.currentSlot, adminAvailability)) {
      return res.status(409).json({
        error: 'This meeting time is outside your configured working hours',
      });
    }

    const conflictDetected = await hasScheduleConflict(
      order._id,
      order.currentSlot,
      adminAvailability.meetingBufferMinutes,
    );

    if (conflictDetected) {
      return res.status(409).json({
        error: 'This time overlaps with another confirmed service meeting',
      });
    }

    if (!isGoogleCalendarConfigured()) {
      return res.status(503).json({
        error: 'Google Calendar integration is not configured on the server',
      });
    }

    if (!req.user?.googleCalendar?.refreshTokenEncrypted) {
      return res.status(409).json({
        error: 'Connect your Google Calendar before confirming the meeting',
      });
    }

    const calendarEvent = await createGoogleCalendarMeeting({
      encryptedRefreshToken: req.user.googleCalendar.refreshTokenEncrypted,
      calendarId: req.user.googleCalendar.calendarId || 'primary',
      summary: `${order.serviceTitle} - Tata Islem`,
      description: `Service meeting with ${order.fullName}\nEmail: ${order.email}\nPhone: ${order.phoneNumber}${
        note ? `\nNote: ${note}` : ''
      }`,
      startAt: order.currentSlot.startAt,
      endAt: order.currentSlot.endAt,
      timeZone: adminAvailability.timezone,
      attendeeEmails: [order.email],
    });

    order.scheduleStatus = 'confirmed';
    order.alternativeSlots = [];
    order.confirmedAt = new Date();
    order.lastScheduleUpdateAt = new Date();
    order.scheduleNote = note;
    order.meetingProvider = 'google_meet';
    order.meetingUrl = calendarEvent.meetingUrl;
    order.googleCalendarEventId = calendarEvent.eventId;
    order.googleCalendarHtmlLink = calendarEvent.eventHtmlLink;
    order.meetingReminderClientSent = false;
    order.meetingReminderAdminSent = false;
    await order.save();

    await sendServiceScheduleDecisionMail(order, 'confirmed');

    return res.json({
      message: 'Service meeting confirmed',
      order,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unable to confirm the reservation',
    });
  }
};

export const declineServiceSchedule = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await findManageableServiceOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Service reservation not found' });
    }

    if (
      order.scheduleStatus !== 'pending_admin_confirmation' &&
      order.scheduleStatus !== 'pending_client_selection'
    ) {
      return res.status(409).json({
        error: 'Only active scheduling requests can be declined',
      });
    }

    order.scheduleStatus = 'cancelled';
    order.alternativeSlots = [];
    order.confirmedAt = null;
    order.lastScheduleUpdateAt = new Date();
    order.scheduleNote = String(req.body?.note || '').trim();
    order.meetingProvider = null;
    order.meetingUrl = null;
    order.googleCalendarEventId = null;
    order.googleCalendarHtmlLink = null;
    order.meetingReminderClientSent = false;
    order.meetingReminderAdminSent = false;
    await order.save();

    await sendServiceScheduleDecisionMail(order, 'cancelled');

    return res.json({
      message: 'Service meeting request declined',
      order,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unable to decline the reservation',
    });
  }
};

export const proposeServiceAlternatives = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await findManageableServiceOrder(orderId);
    const adminAvailability = normalizeAdminAvailability(req.user?.adminAvailability);

    if (!order) {
      return res.status(404).json({ error: 'Service reservation not found' });
    }

    if (
      order.scheduleStatus !== 'pending_admin_confirmation' &&
      order.scheduleStatus !== 'pending_client_selection'
    ) {
      return res.status(409).json({
        error: 'Only active scheduling requests can receive new alternative dates',
      });
    }

    const requestedSlots = Array.isArray(req.body?.alternativeSlots)
      ? req.body.alternativeSlots
      : [];
    const alternativeSlots = requestedSlots.length
      ? normalizeAlternativeSlots(requestedSlots, resolveServiceDurationMinutes(order))
      : generateSuggestedAlternativeSlots({
          baseStartAt: order.currentSlot?.startAt || order.requestedSlot?.startAt || new Date(),
          durationMinutes: resolveServiceDurationMinutes(order),
          rawAvailability: adminAvailability,
          orders: await ServiceOrder.find({ paymentStatus: 'paid' }).lean(),
          excludeOrderId: order._id,
        });

    if (!alternativeSlots.length) {
      return res.status(400).json({ error: 'Please provide at least one future time slot' });
    }

    const unauthorizedSlot = alternativeSlots.find(
      (slot) => !isSlotWithinAvailability(slot, adminAvailability),
    );

    if (unauthorizedSlot) {
      return res.status(409).json({
        error: 'One of the proposed dates is outside your configured working hours',
      });
    }

    let conflictingSlot = null;

    for (const slot of alternativeSlots) {
      const conflictDetected = await hasScheduleConflict(
        order._id,
        slot,
        adminAvailability.meetingBufferMinutes,
      );

      if (conflictDetected) {
        conflictingSlot = slot;
        break;
      }
    }

    if (conflictingSlot) {
      return res.status(409).json({
        error: 'One of the proposed dates overlaps with another confirmed meeting',
      });
    }

    order.alternativeSlots = alternativeSlots;
    order.scheduleStatus = 'pending_client_selection';
    order.lastScheduleUpdateAt = new Date();
    order.confirmedAt = null;
    order.scheduleNote = String(req.body?.note || '').trim();
    await order.save();

    await sendServiceScheduleDecisionMail(order, 'alternatives');

    return res.json({
      message: 'Alternative dates sent to the client',
      order,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to send new dates' });
  }
};

export const updateAdminAvailability = async (req, res) => {
  try {
    if (!validateWeeklyHoursShape(req.body?.weeklyHours)) {
      return res.status(400).json({ error: 'Please provide a complete weekly availability' });
    }

    const adminAvailability = normalizeAdminAvailability(req.body);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          adminAvailability,
        },
      },
      { new: true },
    ).select('adminAvailability');

    return res.json({
      message: 'Working hours updated',
      adminAvailability: normalizeAdminAvailability(user?.adminAvailability),
    });
  } catch {
    return res.status(500).json({ error: 'Unable to update working hours' });
  }
};
