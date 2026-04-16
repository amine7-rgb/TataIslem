import mongoose from 'mongoose';

const scheduleSlotSchema = new mongoose.Schema(
  {
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { _id: false },
);

const serviceOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    serviceTitle: { type: String, required: true },
    amount: { type: Number, required: true },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 480,
    },
    requestedSlot: {
      type: scheduleSlotSchema,
      default: null,
    },
    currentSlot: {
      type: scheduleSlotSchema,
      default: null,
    },
    alternativeSlots: {
      type: [scheduleSlotSchema],
      default: [],
    },
    scheduleStatus: {
      type: String,
      enum: [
        'pending_payment',
        'pending_admin_confirmation',
        'pending_client_selection',
        'confirmed',
        'cancelled',
      ],
      default: 'pending_payment',
      index: true,
    },
    scheduleNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    meetingUrl: {
      type: String,
      default: null,
      trim: true,
    },
    meetingProvider: {
      type: String,
      enum: ['google_meet', null],
      default: null,
    },
    googleCalendarEventId: {
      type: String,
      default: null,
      trim: true,
    },
    googleCalendarHtmlLink: {
      type: String,
      default: null,
      trim: true,
    },
    lastScheduleUpdateAt: {
      type: Date,
      default: null,
    },
    meetingReminderClientSent: {
      type: Boolean,
      default: false,
    },
    meetingReminderAdminSent: {
      type: Boolean,
      default: false,
    },
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

serviceOrderSchema.index({ 'currentSlot.startAt': 1 });
serviceOrderSchema.index({ scheduleStatus: 1, paymentStatus: 1 });

export default mongoose.model('ServiceOrder', serviceOrderSchema);
