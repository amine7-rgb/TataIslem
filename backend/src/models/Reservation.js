import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    minlength: [3, 'Full name must be at least 3 characters'],
    trim: true,
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },

  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+\d{8,15}$/, 'Please use a valid international phone number'],
  },

  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female'],
  },

  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },

  eventTitle: {
    type: String,
    trim: true,
  },

  eventDate: Date,

  eventAddress: {
    type: String,
    trim: true,
  },

  amount: {
    type: Number,
    default: 0,
    min: 0,
  },

  seats: {
    type: Number,
    default: 1,
    min: 1,
  },

  stripeSessionId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  reminder3DaysSent: {
    type: Boolean,
    default: false,
  },

  reminderDaySent: {
    type: Boolean,
    default: false,
  },

  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },

  paymentStatus: {
    type: String,
    enum: ['paid'],
    default: 'paid',
  },
});

reservationSchema.index({ email: 1, eventId: 1 }, { unique: true });
reservationSchema.index({ userId: 1, eventId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Reservation', reservationSchema);
