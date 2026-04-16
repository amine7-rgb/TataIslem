import Review from '../models/Review.js';

const DEFAULT_PUBLIC_LIMIT = 8;
const DEFAULT_ADMIN_PAGE = 1;
const DEFAULT_ADMIN_LIMIT = 8;
const MAX_ADMIN_LIMIT = 24;

const parsePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsedValue = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(parsedValue, max);
};

const buildReviewPayload = (review) => ({
  _id: review._id,
  userId: review.userId?._id || review.userId || null,
  headline: review.headline || '',
  text: review.text,
  rating: review.rating,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  author: {
    fullName:
      review.userId?.fullName ||
      `${review.userId?.firstName || ''} ${review.userId?.lastName || ''}`.trim() ||
      'Verified client',
    email: review.userId?.email || null,
    avatarUrl: review.userId?.avatarUrl || null,
  },
});

const sanitizeReviewInput = (payload) => {
  const headline = String(payload?.headline || '').trim();
  const text = String(payload?.text || '').trim();
  const rating = Number(payload?.rating);

  if (!text || text.length < 20) {
    throw new Error('Please write at least 20 characters for your review');
  }

  if (text.length > 600) {
    throw new Error('Review text must stay under 600 characters');
  }

  if (headline.length > 90) {
    throw new Error('Headline must stay under 90 characters');
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Please choose a rating between 1 and 5');
  }

  return {
    headline,
    text,
    rating,
  };
};

export const getPublicReviews = async (req, res) => {
  try {
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_PUBLIC_LIMIT, 20);
    const reviews = await Review.find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate('userId', 'firstName lastName avatarUrl');

    return res.json({
      items: reviews.map(buildReviewPayload),
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load testimonials right now' });
  }
};

export const saveOwnReview = async (req, res) => {
  try {
    const payload = sanitizeReviewInput(req.body);
    const review = await Review.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          userId: req.user._id,
          ...payload,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    ).populate('userId', 'firstName lastName email avatarUrl');

    return res.json({
      message: 'Your review has been saved',
      review: buildReviewPayload(review),
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to save your review' });
  }
};

export const getAdminReviews = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, DEFAULT_ADMIN_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_ADMIN_LIMIT, MAX_ADMIN_LIMIT);
    const totalItems = await Review.countDocuments();
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const reviews = await Review.find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email avatarUrl');

    const ratingRows = await Review.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
        },
      },
    ]);

    return res.json({
      items: reviews.map(buildReviewPayload),
      stats: {
        totalItems,
        averageRating: ratingRows[0]?.averageRating ?? 0,
      },
      pagination: {
        page: currentPage,
        limit,
        totalItems,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load the review list' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.json({ message: 'Review deleted successfully' });
  } catch {
    return res.status(500).json({ error: 'Unable to delete the review' });
  }
};
