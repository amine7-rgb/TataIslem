import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    headline: {
      type: String,
      default: '',
      trim: true,
      maxlength: 90,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 600,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Review', reviewSchema);
