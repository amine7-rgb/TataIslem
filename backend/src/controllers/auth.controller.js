import validator from 'validator';
import User from '../models/User.js';
import {
  clearSessionCookie,
  createEmailVerificationToken,
  createPasswordResetToken,
  createSession,
  deleteAllSessionsForUser,
  deleteSessionFromRequest,
  extractRequestIp,
  hashPassword,
  hashToken,
  normalizeEmail,
  sanitizeUser,
  setSessionCookie,
  verifyPassword,
} from '../services/auth.service.js';
import {
  sendPasswordResetMail,
  sendVerificationMail,
} from '../services/authMail.service.js';
import { buildClientRouteUrl } from '../config/clientOrigins.js';

const phoneRegex = /^\+\d{8,15}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

const validateRegistrationPayload = (payload) => {
  const errors = [];

  if (!payload.firstName || String(payload.firstName).trim().length < 2) {
    errors.push('First name must contain at least 2 characters');
  }

  if (!payload.lastName || String(payload.lastName).trim().length < 2) {
    errors.push('Last name must contain at least 2 characters');
  }

  if (!payload.email || !validator.isEmail(String(payload.email))) {
    errors.push('Please provide a valid email address');
  }

  if (!payload.password || !passwordRegex.test(String(payload.password))) {
    errors.push(
      'Password must be at least 12 characters and include upper, lower, number and symbol',
    );
  }

  if (!payload.phoneNumber || !phoneRegex.test(String(payload.phoneNumber))) {
    errors.push('Please provide a valid international phone number');
  }

  return errors;
};

const buildVerificationUrl = (candidateOrigin, rawToken) =>
  `${buildClientRouteUrl(
    candidateOrigin,
    '/verify-email',
  )}?token=${encodeURIComponent(rawToken)}`;

const buildResetPasswordUrl = (candidateOrigin, rawToken) =>
  `${buildClientRouteUrl(
    candidateOrigin,
    '/reset-password',
  )}?token=${encodeURIComponent(rawToken)}`;

export const register = async (req, res) => {
  try {
    const errors = validateRegistrationPayload(req.body);

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const email = normalizeEmail(req.body.email);
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.emailVerified) {
      return res.status(409).json({ error: 'An account already exists with this email' });
    }

    const passwordHash = await hashPassword(req.body.password);
    const { rawToken, tokenHash, expiresAt } = createEmailVerificationToken();
    const normalizedAddress =
      typeof req.body.address === 'string' ? String(req.body.address).trim() : '';
    let user = existingUser;

    if (user) {
      user.firstName = String(req.body.firstName).trim();
      user.lastName = String(req.body.lastName).trim();
      user.passwordHash = passwordHash;
      user.phoneNumber = String(req.body.phoneNumber).trim();
      if (normalizedAddress) {
        user.address = normalizedAddress;
      }
      user.role = 'user';
      user.emailVerificationTokenHash = tokenHash;
      user.emailVerificationExpiresAt = expiresAt;
      user.emailVerified = false;
      await user.save();
    } else {
      user = await User.create({
        firstName: String(req.body.firstName).trim(),
        lastName: String(req.body.lastName).trim(),
        email,
        passwordHash,
        phoneNumber: String(req.body.phoneNumber).trim(),
        address: normalizedAddress,
        role: 'user',
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      });
    }

    await sendVerificationMail(user, buildVerificationUrl(req.headers.origin, rawToken));

    return res.status(201).json({
      message: 'Account created. Check your email to activate it.',
      requiresVerification: true,
    });
  } catch {
    return res.status(500).json({ error: 'Unable to create account right now' });
  }
};

export const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in',
        requiresVerification: true,
      });
    }

    const { token, expiresAt } = await createSession({
      userId: user._id,
      userAgent: String(req.headers['user-agent'] || ''),
      ipAddress: extractRequestIp(req),
    });

    user.lastLoginAt = new Date();
    await user.save();

    setSessionCookie(res, token, expiresAt);

    return res.json({
      message: 'Login successful',
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ error: 'Unable to login right now' });
  }
};

export const logout = async (req, res) => {
  try {
    await deleteSessionFromRequest(req);
    clearSessionCookie(res);
    return res.json({ message: 'Logged out' });
  } catch {
    return res.status(500).json({ error: 'Unable to logout right now' });
  }
};

export const me = async (req, res) => {
  return res.json({ user: req.authUser });
};

export const verifyEmail = async (req, res) => {
  try {
    const rawToken = String(req.query.token || '').trim();

    if (!rawToken) {
      return res.status(400).json({ error: 'Verification token is missing' });
    }

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Verification link is invalid or expired' });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.json({ message: 'Email verified successfully' });
  } catch {
    return res.status(500).json({ error: 'Unable to verify email right now' });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'This account is already verified' });
    }

    const { rawToken, tokenHash, expiresAt } = createEmailVerificationToken();
    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpiresAt = expiresAt;
    await user.save();

    await sendVerificationMail(user, buildVerificationUrl(req.headers.origin, rawToken));

    return res.json({ message: 'Verification email sent again' });
  } catch {
    return res.status(500).json({ error: 'Unable to resend verification email' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email });

    if (user?.emailVerified) {
      const { rawToken, tokenHash, expiresAt } = createPasswordResetToken();
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = expiresAt;
      await user.save();

      await sendPasswordResetMail(user, buildResetPasswordUrl(req.headers.origin, rawToken));
    }

    return res.json({
      message: 'If an account matches this email, a password reset link has been sent.',
    });
  } catch {
    return res.status(500).json({ error: 'Unable to process the password reset request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const rawToken = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!rawToken) {
      return res.status(400).json({ error: 'Reset token is missing' });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 12 characters and include upper, lower, number and symbol',
      });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(rawToken),
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or expired' });
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    await deleteAllSessionsForUser(user._id);
    clearSessionCookie(res);

    return res.json({
      message: 'Password updated successfully. You can now log in with your new password.',
    });
  } catch {
    return res.status(500).json({ error: 'Unable to reset password right now' });
  }
};
