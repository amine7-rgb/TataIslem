import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    shortDesc: { type: String },
    fullDesc: { type: String },
    price: { type: Number, required: true },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 480,
    },
    stripePriceId: {
      type: String,
      default: '',
      trim: true,
    },
    image: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Service', ServiceSchema);
