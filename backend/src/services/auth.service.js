import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';

const SESSION_COOKIE_NAME = 'tata_session';
const SESSION_DURATION_DAYS = 7;
const EMAIL_VERIFICATION_DURATION_HOURS = 24;
const PASSWORD_RESET_DURATION_HOURS = 2;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_COST = 16384;

const randomHex = (size = 32) => crypto.randomBytes(size).toString('hex');

export const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

const scryptAsync = (password, salt, keylen) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      keylen,
      { N: PASSWORD_COST, r: 8, p: 1 },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });

export const hashPassword = async (password) => {
  const salt = randomHex(16);
  const derivedKey = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password, passwordHash) => {
  const [salt, storedHash] = String(passwordHash || '').split(':');

  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
};

export const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    avatarUrl: user.avatarUrl || null,
    phoneNumber: user.phoneNumber,
    address: user.address,
    role: user.role,
    emailVerified: user.emailVerified,
    googleCalendarConnected: Boolean(user.googleCalendar?.refreshTokenEncrypted),
    googleCalendarEmail: user.googleCalendar?.email || null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
};

export const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map((cookiePart) => cookiePart.trim())
    .filter(Boolean)
    .reduce((accumulator, cookiePart) => {
      const separatorIndex = cookiePart.indexOf('=');

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = cookiePart.slice(0, separatorIndex).trim();
      const value = cookiePart.slice(separatorIndex + 1).trim();

      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
};

const buildCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge != null) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

export const setSessionCookie = (res, token, expiresAt) => {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );

  res.setHeader(
    'Set-Cookie',
    buildCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: maxAgeSeconds,
    }),
  );
};

export const clearSessionCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    buildCookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
    }),
  );
};

export const createSession = async ({ userId, userAgent = '', ipAddress = '' }) => {
  const token = randomHex(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await Session.create({
    userId,
    tokenHash: hashToken(token),
    userAgent,
    ipAddress,
    expiresAt,
  });

  return { token, expiresAt };
};

export const getAuthenticatedUserFromRequest = async (req) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  if (!sessionToken) {
    return { user: null, session: null };
  }

  const session = await Session.findOne({
    tokenHash: hashToken(sessionToken),
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return { user: null, session: null };
  }

  const user = await User.findById(session.userId);

  if (!user) {
    return { user: null, session };
  }

  session.lastUsedAt = new Date();
  await session.save();

  return { user, session };
};

export const deleteSessionFromRequest = async (req) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  if (!sessionToken) {
    return;
  }

  await Session.findOneAndDelete({ tokenHash: hashToken(sessionToken) });
};

export const deleteAllSessionsForUser = async (userId) => {
  if (!userId) {
    return;
  }

  await Session.deleteMany({ userId });
};

const createExpiringToken = (durationHours) => {
  const rawToken = randomHex(24);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  return { rawToken, tokenHash, expiresAt };
};

export const createEmailVerificationToken = () =>
  createExpiringToken(EMAIL_VERIFICATION_DURATION_HOURS);

export const createPasswordResetToken = () =>
  createExpiringToken(PASSWORD_RESET_DURATION_HOURS);

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const resolveRegistrationRole = async (email) => {
  const adminEmails = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(normalizeEmail(email))) {
    return 'admin';
  }

  const usersCount = await User.countDocuments();
  return usersCount === 0 ? 'admin' : 'user';
};

export const extractRequestIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (forwardedFor.length > 0) {
    return forwardedFor[0];
  }

  return req.socket?.remoteAddress || '';
};

export const getSessionCookieName = () => SESSION_COOKIE_NAME;
