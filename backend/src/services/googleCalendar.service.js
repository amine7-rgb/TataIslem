import crypto from 'crypto';
import fetch from 'node-fetch';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_CALENDAR_SCOPE = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
  'profile',
].join(' ');

const getRequiredGoogleConfig = () => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = String(process.env.GOOGLE_REDIRECT_URI || '').trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Calendar OAuth is not configured');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
};

const getGoogleTokenEncryptionKey = () => {
  const rawKey = String(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || '').trim();

  if (!rawKey) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is required');
  }

  return crypto.createHash('sha256').update(rawKey).digest();
};

const toFormBody = (payload) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(payload || {})) {
    if (value != null && value !== '') {
      params.set(key, String(value));
    }
  }

  return params.toString();
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error_description || data.error?.message || data.error || 'Google API request failed');
  }

  return data;
};

const sleep = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

export const isGoogleCalendarConfigured = () => {
  try {
    getRequiredGoogleConfig();
    getGoogleTokenEncryptionKey();
    return true;
  } catch {
    return false;
  }
};

export const encryptGoogleRefreshToken = (refreshToken) => {
  const encryptionKey = getGoogleTokenEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(refreshToken), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptGoogleRefreshToken = (encryptedToken) => {
  const encryptionKey = getGoogleTokenEncryptionKey();
  const [ivHex, authTagHex, payloadHex] = String(encryptedToken || '').split(':');

  if (!ivHex || !authTagHex || !payloadHex) {
    throw new Error('Stored Google Calendar token is invalid');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(ivHex, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(payloadHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
};

export const buildGoogleAuthorizationUrl = ({ state, loginHint }) => {
  const { clientId, redirectUri } = getRequiredGoogleConfig();
  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  if (loginHint) {
    url.searchParams.set('login_hint', loginHint);
  }

  return url.toString();
};

export const exchangeGoogleAuthorizationCode = async (code) => {
  const { clientId, clientSecret, redirectUri } = getRequiredGoogleConfig();

  return await requestJson(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toFormBody({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
};

export const refreshGoogleAccessToken = async (encryptedRefreshToken) => {
  const { clientId, clientSecret } = getRequiredGoogleConfig();
  const refreshToken = decryptGoogleRefreshToken(encryptedRefreshToken);
  const tokenResponse = await requestJson(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toFormBody({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  return tokenResponse.access_token;
};

export const getGoogleAccountProfile = async (accessToken) => {
  return await requestJson(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

const extractGoogleMeetUrl = (eventData) =>
  eventData?.hangoutLink ||
  eventData?.conferenceData?.entryPoints?.find((entryPoint) => entryPoint.entryPointType === 'video')
    ?.uri ||
  null;

const fetchCalendarEvent = async ({ accessToken, calendarId, eventId }) => {
  const encodedCalendarId = encodeURIComponent(calendarId || 'primary');
  const encodedEventId = encodeURIComponent(eventId);

  return await requestJson(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${encodedEventId}?conferenceDataVersion=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
};

export const createGoogleCalendarMeeting = async ({
  encryptedRefreshToken,
  calendarId = 'primary',
  summary,
  description,
  startAt,
  endAt,
  timeZone = 'Africa/Lagos',
  attendeeEmails = [],
}) => {
  const accessToken = await refreshGoogleAccessToken(encryptedRefreshToken);
  const encodedCalendarId = encodeURIComponent(calendarId || 'primary');
  const event = await requestJson(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description,
        start: {
          dateTime: new Date(startAt).toISOString(),
          timeZone,
        },
        end: {
          dateTime: new Date(endAt).toISOString(),
          timeZone,
        },
        attendees: [...new Set(attendeeEmails.filter(Boolean))].map((email) => ({
          email,
        })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      }),
    },
  );

  let resolvedEvent = event;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const meetingUrl = extractGoogleMeetUrl(resolvedEvent);

    if (meetingUrl) {
      break;
    }

    await sleep(1200);
    resolvedEvent = await fetchCalendarEvent({
      accessToken,
      calendarId,
      eventId: event.id,
    });
  }

  const meetingUrl = extractGoogleMeetUrl(resolvedEvent);

  if (!meetingUrl) {
    throw new Error('Google Meet link could not be generated');
  }

  return {
    eventId: resolvedEvent.id,
    eventHtmlLink: resolvedEvent.htmlLink || null,
    meetingUrl,
    organizerEmail: resolvedEvent.organizer?.email || null,
  };
};
