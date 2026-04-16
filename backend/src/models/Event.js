import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  totalSeats: {
    type: Number,
    required: true,
    min: 1,
  },

  availableSeats: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function (v) {
        return v <= this.totalSeats;
      },
      message: 'Available seats cannot exceed total seats',
    },
  },

  status: {
    type: String,
    enum: ['active', 'full'],
    default: 'active',
  },

  address: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto FULL logic
eventSchema.pre('save', function (next) {
  if (this.isNew && this.availableSeats == null) {
    this.availableSeats = this.totalSeats;
  }

  this.status = this.availableSeats === 0 ? 'full' : 'active';
  next();
});

// Geo index
eventSchema.index({ location: '2dsphere' });
eventSchema.index({ date: 1 });

export default mongoose.model('Event', eventSchema);
