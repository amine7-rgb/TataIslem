import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { buildClientRouteUrl } from '../config/clientOrigins.js';
import { generateInvoice } from './invoice.service.js';
import { generateTicket } from './ticket.service.js';
import { generateServiceInvoice } from './serviceInvoice.service.js';
import { formatScheduleWindow } from './serviceSchedule.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../images/logo.jpeg');
const mailPreviewDirectory = path.join(process.cwd(), 'mail-previews');

const resolveMailSecure = () => {
  const explicitValue = String(process.env.MAIL_SECURE || '')
    .trim()
    .toLowerCase();

  if (explicitValue === 'true') {
    return true;
  }

  if (explicitValue === 'false') {
    return false;
  }

  return Number(process.env.MAIL_PORT) === 465;
};

export const buildMailFromAddress = (displayName = 'Tata Islem') =>
  `"${displayName}" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`;

export const buildReplyToAddress = () =>
  String(process.env.MAIL_REPLY_TO || process.env.MAIL_FROM || process.env.MAIL_USER || '')
    .trim();

const shouldSaveMailPreview = () =>
  String(process.env.MAIL_SAVE_PREVIEW || '')
    .trim()
    .toLowerCase() === 'true';

const derivePlainText = (htmlContent = '') =>
  String(htmlContent || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const withMailDefaults = (mailOptions = {}) => {
  const html = String(mailOptions.html || '').trim();
  const replyTo = buildReplyToAddress();

  return {
    ...mailOptions,
    replyTo: mailOptions.replyTo || replyTo || undefined,
    sender: mailOptions.sender || process.env.MAIL_FROM || process.env.MAIL_USER || undefined,
    text: mailOptions.text || (html ? derivePlainText(html) : undefined),
    headers: {
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
      ...(mailOptions.headers || {}),
    },
  };
};

const writeMailPreview = async ({ context, mailOptions, messageId }) => {
  const htmlContent = String(mailOptions.html || '').trim();

  if (!htmlContent) {
    return null;
  }

  await fs.mkdir(mailPreviewDirectory, { recursive: true });

  const safeContext = String(context || 'mail').replace(/[^a-z0-9_-]+/gi, '-');
  const safeMessageId = String(messageId || Date.now()).replace(/[^a-z0-9_-]+/gi, '-');
  const filePath = path.join(mailPreviewDirectory, `${safeContext}-${safeMessageId}.html`);

  await fs.writeFile(filePath, htmlContent, 'utf8');

  return filePath;
};

const buildDashboardLink = (routePath) => buildClientRouteUrl(process.env.CLIENT_URL, routePath);

const resolveAdminRecipients = async () => {
  const configuredEmails = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (configuredEmails.length > 0) {
    return [...new Set(configuredEmails)];
  }

  const adminUsers = await User.find({ role: 'admin' }).select('email').lean();
  const adminEmails = adminUsers
    .map((user) => String(user.email || '').trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0) {
    return [...new Set(adminEmails)];
  }

  return [String(process.env.MAIL_USER || '').trim()].filter(Boolean);
};

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: resolveMailSecure(),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

export const sendMailWithDiagnostics = async (mailOptions, context = 'mail') => {
  const preparedMailOptions = withMailDefaults(mailOptions);
  const info = await transporter.sendMail(preparedMailOptions);
  const accepted = Array.isArray(info.accepted) ? info.accepted.filter(Boolean) : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected.filter(Boolean) : [];
  const previewPath = shouldSaveMailPreview()
    ? await writeMailPreview({
        context,
        mailOptions: preparedMailOptions,
        messageId: info.messageId,
      })
    : null;

  console.info(
    `[mail:${context}] messageId=${info.messageId || 'n/a'} accepted=${
      accepted.join(', ') || 'none'
    } rejected=${rejected.join(', ') || 'none'}${previewPath ? ` preview=${previewPath}` : ''}`,
  );

  if (!accepted.length && rejected.length) {
    throw new Error(`SMTP rejected all recipients for ${context}`);
  }

  return info;
};

const withLogo = () => [
  {
    filename: 'logo.jpeg',
    path: logoPath,
    cid: 'logo',
  },
];

const buildEventConfirmationTemplate = (data) => `
  <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
      <div style="background:#183b59;padding:22px;text-align:center">
        <img src="cid:logo" alt="Tata Islem" style="height:58px" />
      </div>
      <div style="padding:32px;color:#183b59">
        <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Reservation confirmed</p>
        <h2 style="margin:0 0 14px">Your seat is now secured</h2>
        <p>Hello <strong>${data.fullName}</strong>, your reservation for <strong>${data.eventTitle}</strong> has been confirmed.</p>
        <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
          <p><strong>Event:</strong> ${data.eventTitle}</p>
          <p><strong>Date:</strong> ${new Date(data.eventDate).toLocaleString('fr-FR')}</p>
          <p><strong>Location:</strong> ${data.eventAddress || 'Shared soon'}</p>
          <p><strong>Amount:</strong> EUR ${(data.amount || 0).toFixed(2)}</p>
        </div>
        <p style="margin-top:18px">Your invoice and ticket are attached to this email.</p>
      </div>
    </div>
  </div>
`;

const buildServiceConfirmationTemplate = (data) => `
  <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
      <div style="background:#183b59;padding:22px;text-align:center">
        <img src="cid:logo" alt="Tata Islem" style="height:58px" />
      </div>
      <div style="padding:32px;color:#183b59">
        <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Payment confirmed</p>
        <h2 style="margin:0 0 14px">Your service has been booked</h2>
        <p>Hello <strong>${data.fullName}</strong>, your payment for <strong>${data.serviceTitle}</strong> has been successfully confirmed.</p>
        <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
          <p><strong>Service:</strong> ${data.serviceTitle}</p>
          <p><strong>Amount:</strong> EUR ${(data.amount || 0).toFixed(2)}</p>
          <p><strong>Email:</strong> ${data.email}</p>
        </div>
        <p style="margin-top:18px">Our team will contact you shortly. Your invoice is attached.</p>
      </div>
    </div>
  </div>
`;

const buildServicePendingTemplate = (data) => `
  <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
      <div style="background:#183b59;padding:22px;text-align:center">
        <img src="cid:logo" alt="Tata Islem" style="height:58px" />
      </div>
      <div style="padding:32px;color:#183b59">
        <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Payment received</p>
        <h2 style="margin:0 0 14px">Your service request is waiting for admin confirmation</h2>
        <p>Hello <strong>${data.fullName}</strong>, we received your payment for <strong>${data.serviceTitle}</strong>.</p>
        <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
          <p><strong>Service:</strong> ${data.serviceTitle}</p>
          <p><strong>Requested meeting:</strong> ${formatScheduleWindow(data.currentSlot || data.requestedSlot)}</p>
          <p><strong>Amount:</strong> EUR ${(data.amount || 0).toFixed(2)}</p>
        </div>
        <p style="margin-top:18px">The admin will either confirm this time or send you other available dates in your dashboard.</p>
        <p><a href="${buildDashboardLink('/dashboard')}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#183b59;color:#fff;text-decoration:none">Open my dashboard</a></p>
      </div>
    </div>
  </div>
`;

const buildServiceConfirmedTemplate = (data) => `
  <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
      <div style="background:#183b59;padding:22px;text-align:center">
        <img src="cid:logo" alt="Tata Islem" style="height:58px" />
      </div>
      <div style="padding:32px;color:#183b59">
        <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Meeting confirmed</p>
        <h2 style="margin:0 0 14px">Your service appointment is now locked in</h2>
        <p>Hello <strong>${data.fullName}</strong>, your appointment for <strong>${data.serviceTitle}</strong> has been confirmed.</p>
        <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
          <p><strong>Confirmed slot:</strong> ${formatScheduleWindow(data.currentSlot || data.requestedSlot)}</p>
          <p><strong>Service:</strong> ${data.serviceTitle}</p>
          ${
            data.meetingUrl
              ? `<p><strong>Google Meet:</strong> <a href="${data.meetingUrl}">${data.meetingUrl}</a></p>`
              : ''
          }
          ${
            data.googleCalendarHtmlLink
              ? `<p><strong>Google Calendar:</strong> <a href="${data.googleCalendarHtmlLink}">Open calendar event</a></p>`
              : ''
          }
          ${
            data.scheduleNote
              ? `<p><strong>Admin note:</strong> ${data.scheduleNote}</p>`
              : ''
          }
        </div>
        <p style="margin-top:18px">The meeting now appears in your dashboard calendar and a Google Calendar invite has been sent for the confirmed slot.</p>
        <p><a href="${buildDashboardLink('/dashboard')}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#183b59;color:#fff;text-decoration:none">View my calendar</a></p>
      </div>
    </div>
  </div>
`;

const buildServiceAlternativesTemplate = (data) => `
  <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
      <div style="background:#183b59;padding:22px;text-align:center">
        <img src="cid:logo" alt="Tata Islem" style="height:58px" />
      </div>
      <div style="padding:32px;color:#183b59">
        <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">New schedule proposed</p>
        <h2 style="margin:0 0 14px">Please choose one of the new meeting dates</h2>
        <p>Hello <strong>${data.fullName}</strong>, the admin is unavailable at your original requested time for <strong>${data.serviceTitle}</strong>.</p>
        <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
          <p><strong>Original request:</strong> ${formatScheduleWindow(data.currentSlot || data.requestedSlot)}</p>
          ${
            data.scheduleNote
              ? `<p><strong>Admin note:</strong> ${data.scheduleNote}</p>`
              : ''
          }
          <p style="margin-top:14px"><strong>Available alternatives:</strong></p>
          <ul style="padding-left:18px;margin:8px 0 0">
            ${(data.alternativeSlots || [])
              .map(
                (slot) =>
                  `<li style="margin-bottom:6px">${formatScheduleWindow(slot)}</li>`,
              )
              .join('')}
          </ul>
        </div>
        <p style="margin-top:18px">Choose the slot you prefer in your dashboard so the admin can confirm it.</p>
        <p><a href="${buildDashboardLink('/dashboard')}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#183b59;color:#fff;text-decoration:none">Choose a new date</a></p>
      </div>
    </div>
  </div>
`;

const buildServiceCancelledTemplate = (data) => `
  <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
      <div style="background:#183b59;padding:22px;text-align:center">
        <img src="cid:logo" alt="Tata Islem" style="height:58px" />
      </div>
      <div style="padding:32px;color:#183b59">
        <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Scheduling update</p>
        <h2 style="margin:0 0 14px">Your service meeting request was declined</h2>
        <p>Hello <strong>${data.fullName}</strong>, the admin is currently unable to keep the meeting request for <strong>${data.serviceTitle}</strong>.</p>
        <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
          <p><strong>Service:</strong> ${data.serviceTitle}</p>
          <p><strong>Original request:</strong> ${formatScheduleWindow(data.currentSlot || data.requestedSlot)}</p>
          ${
            data.scheduleNote
              ? `<p><strong>Admin note:</strong> ${data.scheduleNote}</p>`
              : ''
          }
        </div>
        <p style="margin-top:18px">This meeting request has been removed from your scheduling calendar. If you still want to continue, please contact the Tata Islem team for a new arrangement.</p>
        <p><a href="${buildDashboardLink('/dashboard')}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#183b59;color:#fff;text-decoration:none">Open my dashboard</a></p>
      </div>
    </div>
  </div>
`;

const buildAdminServiceScheduleTemplate = (data, mode) => {
  const heading =
    mode === 'client_selected_slot'
      ? 'Client selected a new service slot'
      : 'New paid service reservation';
  const intro =
    mode === 'client_selected_slot'
      ? `${data.fullName} selected one of the proposed dates for ${data.serviceTitle}.`
      : `${data.fullName} paid for ${data.serviceTitle} and requested a meeting slot.`;
  const slotLabel =
    mode === 'client_selected_slot' ? 'Selected slot' : 'Requested slot';

  return `
    <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
        <div style="background:#183b59;padding:22px;text-align:center">
          <img src="cid:logo" alt="Tata Islem" style="height:58px" />
        </div>
        <div style="padding:32px;color:#183b59">
          <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Admin action required</p>
          <h2 style="margin:0 0 14px">${heading}</h2>
          <p>${intro}</p>
          <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
            <p><strong>Client:</strong> ${data.fullName}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phoneNumber}</p>
            <p><strong>Service:</strong> ${data.serviceTitle}</p>
            <p><strong>${slotLabel}:</strong> ${formatScheduleWindow(data.currentSlot || data.requestedSlot)}</p>
            <p><strong>Amount:</strong> EUR ${(data.amount || 0).toFixed(2)}</p>
          </div>
          <p style="margin-top:18px">Open the admin calendar to confirm this slot or send other dates.</p>
          <p><a href="${buildDashboardLink('/admin')}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#183b59;color:#fff;text-decoration:none">Open admin dashboard</a></p>
        </div>
      </div>
    </div>
  `;
};

const buildServiceMeetingReminderTemplate = (data, audience = 'client') => {
  const isAdmin = audience === 'admin';
  const heading = isAdmin
    ? 'Service meeting reminder for today'
    : 'Your service meeting is today';
  const intro = isAdmin
    ? `You have a confirmed service meeting with ${data.fullName} today for ${data.serviceTitle}.`
    : `Hello <strong>${data.fullName}</strong>, this is your reminder for today's ${data.serviceTitle} meeting.`;

  return `
    <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
        <div style="background:#183b59;padding:22px;text-align:center">
          <img src="cid:logo" alt="Tata Islem" style="height:58px" />
        </div>
        <div style="padding:32px;color:#183b59">
          <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Meeting reminder</p>
          <h2 style="margin:0 0 14px">${heading}</h2>
          <p>${intro}</p>
          <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
            <p><strong>${isAdmin ? 'Client' : 'Service'}:</strong> ${isAdmin ? data.fullName : data.serviceTitle}</p>
            <p><strong>Meeting time:</strong> ${formatScheduleWindow(data.currentSlot || data.requestedSlot)}</p>
            ${
              isAdmin
                ? `<p><strong>Client email:</strong> ${data.email}</p>`
                : ''
            }
            ${
              data.meetingUrl
                ? `<p><strong>Google Meet:</strong> <a href="${data.meetingUrl}">${data.meetingUrl}</a></p>`
                : ''
            }
            ${
              data.googleCalendarHtmlLink
                ? `<p><strong>Calendar event:</strong> <a href="${data.googleCalendarHtmlLink}">Open in Google Calendar</a></p>`
                : ''
            }
          </div>
          <p style="margin-top:18px">Join the meeting from your dashboard or directly from the Google Meet link.</p>
          <p><a href="${buildDashboardLink(isAdmin ? '/admin' : '/dashboard')}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#183b59;color:#fff;text-decoration:none">${isAdmin ? 'Open admin calendar' : 'Open my dashboard'}</a></p>
        </div>
      </div>
    </div>
  `;
};

const buildReminderTemplate = (data, reminderType) => {
  const heading = reminderType === 'day' ? 'Your event is today' : 'Your event starts in 3 days';
  const message =
    reminderType === 'day'
      ? 'We look forward to welcoming you today. Keep your ticket ready.'
      : 'Your event is coming soon. Save the date and keep your ticket ready.';

  return `
    <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">
        <div style="background:#183b59;padding:22px;text-align:center">
          <img src="cid:logo" alt="Tata Islem" style="height:58px" />
        </div>
        <div style="padding:32px;color:#183b59">
          <p style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">Event reminder</p>
          <h2 style="margin:0 0 14px">${heading}</h2>
          <p>Hello <strong>${data.fullName}</strong>, ${message}</p>
          <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f4ee">
            <p><strong>Event:</strong> ${data.eventTitle}</p>
            <p><strong>Date:</strong> ${new Date(data.eventDate).toLocaleString('fr-FR')}</p>
            <p><strong>Location:</strong> ${data.eventAddress || 'Shared soon'}</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const buildAdminEventReservationTemplate = (data) => `
  <div style="font-family:Arial,sans-serif;background:#f3efe8;padding:28px">
    <div style="max-width:680px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 18px 44px rgba(12,32,48,0.12)">
      <div style="background:linear-gradient(135deg,#102538,#183b59);padding:24px 28px;text-align:center">
        <img src="cid:logo" alt="Tata Islem" style="height:58px" />
      </div>

      <div style="padding:34px 32px;color:#183b59">
        <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a24d;margin:0 0 12px">
          Admin reservation alert
        </p>
        <h2 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#102538">
          A new event booking has just been confirmed
        </h2>
        <p style="margin:0;color:#4e5d6c;line-height:1.8">
          A client completed payment for one of your events. The reservation is now saved
          in the platform and visible from the admin dashboard.
        </p>

        <div style="margin-top:24px;padding:22px 24px;border-radius:18px;background:linear-gradient(145deg,#102538,#1c4263);color:#fff7e8">
          <table role="presentation" style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,247,232,0.72)">
                Event
              </td>
              <td style="padding:0 0 10px;text-align:right;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,247,232,0.72)">
                Amount
              </td>
            </tr>
            <tr>
              <td style="padding:0;font-size:24px;font-weight:700;color:#fff7e8">
                ${data.eventTitle}
              </td>
              <td style="padding:0;text-align:right;font-size:24px;font-weight:700;color:#f4dfb0">
                EUR ${(data.amount || 0).toFixed(2)}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-top:24px;display:grid;gap:16px">
          <div style="padding:20px;border-radius:18px;background:#f8f4ec;border:1px solid rgba(24,59,89,0.08)">
            <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#b88949">
              Client details
            </p>
            <p style="margin:0 0 8px;color:#183b59"><strong>Client:</strong> ${data.fullName}</p>
            <p style="margin:0 0 8px;color:#183b59"><strong>Email:</strong> ${data.email}</p>
            <p style="margin:0;color:#183b59"><strong>Phone:</strong> ${data.phoneNumber}</p>
          </div>

          <div style="padding:20px;border-radius:18px;background:#f8f4ec;border:1px solid rgba(24,59,89,0.08)">
            <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#b88949">
              Reservation details
            </p>
            <p style="margin:0 0 8px;color:#183b59"><strong>Event date:</strong> ${new Date(data.eventDate).toLocaleString('fr-FR')}</p>
            <p style="margin:0 0 8px;color:#183b59"><strong>Location:</strong> ${data.eventAddress || 'Shared soon'}</p>
            <p style="margin:0 0 8px;color:#183b59"><strong>Seats booked:</strong> ${data.seats || 1}</p>
            <p style="margin:0;color:#183b59"><strong>Reserved at:</strong> ${new Date(data.createdAt || Date.now()).toLocaleString('fr-FR')}</p>
          </div>
        </div>

        <div style="margin-top:28px;padding:18px 20px;border-radius:18px;background:rgba(201,162,77,0.08);border:1px solid rgba(201,162,77,0.2)">
          <p style="margin:0;color:#183b59;line-height:1.7">
            Next step: review the reservation activity and seat availability from the admin dashboard.
          </p>
        </div>

        <div style="margin-top:26px">
          <a href="${buildDashboardLink('/admin')}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#183b59;color:#fff7e8;text-decoration:none;font-weight:700">
            Open admin dashboard
          </a>
        </div>
      </div>
    </div>
  </div>
`;

export const sendConfirmationMail = async (data, type) => {
  try {
    let htmlContent = '';
    let attachments = withLogo();
    let subject = 'Confirmation';

    if (type === 'event') {
      const invoice = await generateInvoice(data);
      const ticket = await generateTicket(data);

      htmlContent = buildEventConfirmationTemplate(data);
      subject = 'Your event reservation is confirmed';
      attachments = [
        ...attachments,
        { filename: 'invoice.pdf', content: invoice },
        { filename: 'ticket.pdf', content: ticket },
      ];
    } else if (type === 'service') {
      const invoice = await generateServiceInvoice(data);

      htmlContent = buildServiceConfirmationTemplate(data);
      subject = 'Your service booking is confirmed';
      attachments = [...attachments, { filename: 'service-invoice.pdf', content: invoice }];
    } else if (type === '3days' || type === 'day') {
      htmlContent = buildReminderTemplate(data, type);
      subject = type === 'day' ? 'Reminder: your event is today' : 'Reminder: your event is in 3 days';
    }

    await sendMailWithDiagnostics(
      {
        from: buildMailFromAddress('Tata Islem'),
        to: data.email,
        subject,
        html: htmlContent,
        attachments,
      },
      `client-${type}`,
    );

    console.log('Client mail sent');
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

export const sendAdminPaymentMail = async (data, type) => {
  try {
    let htmlContent = '';
    let subject = 'New payment received';
    let attachments = [];
    const adminRecipients = await resolveAdminRecipients();

    if (type === 'event') {
      htmlContent = buildAdminEventReservationTemplate(data);
      subject = `New event reservation - ${data.eventTitle}`;
      attachments = withLogo();
    }

    if (type === 'service') {
      htmlContent = `
        <h2>New Service Payment</h2>
        <p><strong>Client:</strong> ${data.fullName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phoneNumber}</p>
        <p><strong>Service:</strong> ${data.serviceTitle}</p>
        <p><strong>Amount:</strong> EUR ${(data.amount || 0).toFixed(2)}</p>
      `;
      subject = 'New service payment received';
    }

    await sendMailWithDiagnostics(
      {
        from: buildMailFromAddress('Tata Islem'),
        to: adminRecipients,
        subject,
        html: htmlContent,
        attachments,
      },
      `admin-${type}`,
    );

    console.log('Admin mail sent');
  } catch (err) {
    console.error('Admin email error:', err.message);
  }
};

export const sendServicePaymentPendingMail = async (data) => {
  try {
    const invoice = await generateServiceInvoice(data);

    await sendMailWithDiagnostics(
      {
        from: buildMailFromAddress('Tata Islem'),
        to: data.email,
        subject: 'Payment received - waiting for service confirmation',
        html: buildServicePendingTemplate(data),
        attachments: [...withLogo(), { filename: 'service-invoice.pdf', content: invoice }],
      },
      'client-service-pending',
    );
  } catch (err) {
    console.error('Service pending email error:', err.message);
  }
};

export const sendServiceScheduleDecisionMail = async (data, mode) => {
  try {
    const subject =
      mode === 'confirmed'
        ? 'Your service meeting is confirmed'
        : mode === 'cancelled'
          ? 'Your service meeting request was declined'
          : 'New meeting dates were proposed for your service';
    const html =
      mode === 'confirmed'
        ? buildServiceConfirmedTemplate(data)
        : mode === 'cancelled'
          ? buildServiceCancelledTemplate(data)
          : buildServiceAlternativesTemplate(data);

    await sendMailWithDiagnostics(
      {
        from: buildMailFromAddress('Tata Islem'),
        to: data.email,
        subject,
        html,
        attachments: withLogo(),
      },
      `client-service-${mode}`,
    );
  } catch (err) {
    console.error('Service schedule decision email error:', err.message);
  }
};

export const sendAdminServiceScheduleMail = async (data, mode = 'new_request') => {
  try {
    const adminRecipients = await resolveAdminRecipients();

    await sendMailWithDiagnostics(
      {
        from: buildMailFromAddress('Tata Islem'),
        to: adminRecipients,
        subject:
          mode === 'client_selected_slot'
            ? 'Client selected a new service slot'
            : 'New service reservation awaiting confirmation',
        html: buildAdminServiceScheduleTemplate(data, mode),
        attachments: withLogo(),
      },
      `admin-service-${mode}`,
    );
  } catch (err) {
    console.error('Admin service schedule email error:', err.message);
  }
};

export const sendServiceMeetingReminderMail = async (data, audience = 'client') => {
  try {
    const recipients = audience === 'admin' ? await resolveAdminRecipients() : data.email;

    await sendMailWithDiagnostics(
      {
        from: buildMailFromAddress('Tata Islem'),
        to: recipients,
        subject:
          audience === 'admin'
            ? 'Today: confirmed service meeting reminder'
            : 'Reminder: your service meeting is today',
        html: buildServiceMeetingReminderTemplate(data, audience),
        attachments: withLogo(),
      },
      `service-meeting-reminder-${audience}`,
    );
  } catch (err) {
    console.error('Service meeting reminder email error:', err.message);
  }
};
