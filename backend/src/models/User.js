import mongoose from 'mongoose';

const adminAvailabilitySchema = new mongoose.Schema(
  {
    timezone: {
      type: String,
      default: 'Africa/Lagos',
    },
    meetingBufferMinutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 120,
    },
    slotIntervalMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 60,
    },
    weeklyHours: {
      type: [
        {
          day: { type: String, required: true },
          enabled: { type: Boolean, default: true },
          startTime: { type: String, default: '09:00' },
          endTime: { type: String, default: '17:00' },
        },
      ],
      default: () => [
        { day: 'monday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'friday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'saturday', enabled: true, startTime: '10:00', endTime: '14:00' },
        { day: 'sunday', enabled: false, startTime: '10:00', endTime: '14:00' },
      ],
    },
  },
  { _id: false },
);

const googleCalendarSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    calendarId: {
      type: String,
      default: 'primary',
      trim: true,
    },
    refreshTokenEncrypted: {
      type: String,
      default: null,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: 250,
    },
    adminAvailability: {
      type: adminAvailabilitySchema,
      default: () => ({}),
    },
    googleCalendar: {
      type: googleCalendarSchema,
      default: () => ({}),
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationTokenHash: {
      type: String,
      default: null,
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

export default mongoose.model('User', userSchema);
