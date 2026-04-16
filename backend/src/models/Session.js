import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    googleOAuthStateHash: {
      type: String,
      default: null,
    },
    googleOAuthStateExpiresAt: {
      type: Date,
      default: null,
    },
    googleOAuthReturnUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Session', sessionSchema);
