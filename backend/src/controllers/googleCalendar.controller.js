import crypto from 'crypto';
import User from '../models/User.js';
import { buildClientRouteUrl } from '../config/clientOrigins.js';
import { hashToken } from '../services/auth.service.js';
import {
  buildGoogleAuthorizationUrl,
  encryptGoogleRefreshToken,
  exchangeGoogleAuthorizationCode,
  getGoogleAccountProfile,
  isGoogleCalendarConfigured,
} from '../services/googleCalendar.service.js';

const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;

const resolveGoogleCallbackRedirect = (candidateOrigin, status, message = '') => {
  const targetUrl = new URL(buildClientRouteUrl(candidateOrigin, '/admin'));

  if (status) {
    targetUrl.searchParams.set('google', status);
  }

  if (message) {
    targetUrl.searchParams.set('message', message);
  }

  return targetUrl.toString();
};

export const startGoogleCalendarConnect = async (req, res) => {
  try {
    if (!isGoogleCalendarConfigured()) {
      return res.redirect(
        resolveGoogleCallbackRedirect(req.query.returnTo, 'config-error', 'Google Calendar is not configured'),
      );
    }

    const rawState = crypto.randomBytes(32).toString('hex');

    req.session.googleOAuthStateHash = hashToken(rawState);
    req.session.googleOAuthStateExpiresAt = new Date(Date.now() + GOOGLE_STATE_TTL_MS);
    req.session.googleOAuthReturnUrl = String(req.query.returnTo || req.headers.origin || '').trim();
    await req.session.save();

    return res.redirect(
      buildGoogleAuthorizationUrl({
        state: rawState,
        loginHint: req.user.email,
      }),
    );
  } catch {
    return res.redirect(
      resolveGoogleCallbackRedirect(req.query.returnTo, 'connect-error', 'Unable to start Google Calendar connection'),
    );
  }
};

export const handleGoogleCalendarCallback = async (req, res) => {
  const returnTo = req.session?.googleOAuthReturnUrl || req.headers.origin || process.env.CLIENT_URL;

  try {
    const incomingState = String(req.query.state || '').trim();
    const code = String(req.query.code || '').trim();

    if (!incomingState || !code) {
      return res.redirect(
        resolveGoogleCallbackRedirect(returnTo, 'connect-error', 'Missing Google authorization payload'),
      );
    }

    if (
      !req.session?.googleOAuthStateHash ||
      !req.session?.googleOAuthStateExpiresAt ||
      req.session.googleOAuthStateExpiresAt.getTime() <= Date.now() ||
      req.session.googleOAuthStateHash !== hashToken(incomingState)
    ) {
      return res.redirect(
        resolveGoogleCallbackRedirect(returnTo, 'state-error', 'Google connection state expired'),
      );
    }

    const tokenResponse = await exchangeGoogleAuthorizationCode(code);

    if (!tokenResponse.refresh_token) {
      return res.redirect(
        resolveGoogleCallbackRedirect(
          returnTo,
          'connect-error',
          'Google did not return a refresh token. Please reconnect with consent.',
        ),
      );
    }

    if (!tokenResponse.access_token) {
      return res.redirect(
        resolveGoogleCallbackRedirect(
          returnTo,
          'connect-error',
          'Google did not return an access token. Please try the connection again.',
        ),
      );
    }

    let googleCalendarEmail = String(req.user?.email || '').trim().toLowerCase();

    try {
      const profile = await getGoogleAccountProfile(tokenResponse.access_token);
      googleCalendarEmail = String(profile.email || googleCalendarEmail)
        .trim()
        .toLowerCase();
    } catch {
      googleCalendarEmail = String(req.user?.email || '').trim().toLowerCase();
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        googleCalendar: {
          email: googleCalendarEmail,
          calendarId: 'primary',
          refreshTokenEncrypted: encryptGoogleRefreshToken(tokenResponse.refresh_token),
          connectedAt: new Date(),
        },
      },
    });

    req.session.googleOAuthStateHash = null;
    req.session.googleOAuthStateExpiresAt = null;
    req.session.googleOAuthReturnUrl = null;
    await req.session.save();

    return res.redirect(
      resolveGoogleCallbackRedirect(returnTo, 'connected', 'Google Calendar connected successfully'),
    );
  } catch (error) {
    req.session.googleOAuthStateHash = null;
    req.session.googleOAuthStateExpiresAt = null;
    req.session.googleOAuthReturnUrl = null;
    await req.session.save();

    return res.redirect(
      resolveGoogleCallbackRedirect(
        returnTo,
        'connect-error',
        error.message || 'Unable to connect Google Calendar',
      ),
    );
  }
};

export const disconnectGoogleCalendar = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        googleCalendar: {
          email: null,
          calendarId: 'primary',
          refreshTokenEncrypted: null,
          connectedAt: null,
        },
      },
    });

    return res.json({ message: 'Google Calendar disconnected' });
  } catch {
    return res.status(500).json({ error: 'Unable to disconnect Google Calendar' });
  }
};
