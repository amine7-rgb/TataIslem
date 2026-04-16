import path from 'path';
import { fileURLToPath } from 'url';
import { buildMailFromAddress, sendMailWithDiagnostics } from './mail.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../images/logo.jpeg');

const renderAuthMailTemplate = ({
  eyebrow,
  title,
  greeting,
  body,
  ctaLabel,
  ctaUrl,
  footer,
  secondaryNote,
}) => `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;background:#f4efe7;border-radius:18px;overflow:hidden">
    <div style="background:#183b59;padding:24px;text-align:center">
      <img src="cid:logo" alt="Tata Islem" style="height:64px" />
    </div>
    <div style="padding:36px 34px;color:#183b59">
      <p style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a24d;margin:0 0 14px">${eyebrow}</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2">${title}</h1>
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">${greeting}</p>
      <p style="font-size:15px;line-height:1.7;margin:0 0 18px">${body}</p>
      <a
        href="${ctaUrl}"
        style="display:inline-block;margin-top:10px;padding:14px 24px;background:#c9a24d;color:#183b59;text-decoration:none;border-radius:999px;font-weight:700"
      >
        ${ctaLabel}
      </a>
      <p style="font-size:13px;line-height:1.7;color:#5b6672;margin:22px 0 0">${footer}</p>
      ${
        secondaryNote
          ? `<p style="font-size:12px;line-height:1.7;color:#7a848e;margin:12px 0 0">${secondaryNote}</p>`
          : ''
      }
    </div>
  </div>
`;

const createAuthMailPayload = ({ to, subject, html, text }) => ({
  from: buildMailFromAddress('Tata Islem'),
  to,
  subject,
  text,
  html,
  attachments: [{ filename: 'logo.jpeg', path: logoPath, cid: 'logo' }],
});

export const sendVerificationMail = async (user, verificationUrl) => {
  await sendMailWithDiagnostics(
    createAuthMailPayload({
      to: user.email,
      subject: 'Activate your account',
      text: [
        `Hello ${user.firstName},`,
        '',
        'Your Tata Islem account is almost ready.',
        'Verify your email to unlock reservations, services, your dashboard, invoices, and event reminders.',
        '',
        `Verification link: ${verificationUrl}`,
        '',
        'This link expires in 24 hours. If you did not create this account, you can ignore this email.',
      ].join('\n'),
      html: renderAuthMailTemplate({
        eyebrow: 'Welcome',
        title: 'Activate your Tata Islem account',
        greeting: `Hello <strong>${user.firstName}</strong>, your account is almost ready.`,
        body:
          'Confirm your email address to unlock reservations, services, your client dashboard, invoices, and event reminders in one secure place.',
        ctaLabel: 'Verify my email',
        ctaUrl: verificationUrl,
        footer:
          'This verification link expires in 24 hours. If you did not create this account, you can safely ignore this email.',
      }),
    }),
    'auth-verification',
  );
};

export const sendPasswordResetMail = async (user, resetUrl) => {
  await sendMailWithDiagnostics(
    createAuthMailPayload({
      to: user.email,
      subject: 'Reset your password',
      text: [
        `Hello ${user.firstName},`,
        '',
        'We received a request to reset your Tata Islem password.',
        'Use the secure link below to choose a new password and regain access to your dashboard, bookings, invoices, and reminders.',
        '',
        `Reset link: ${resetUrl}`,
        '',
        'This reset link expires in 2 hours. Once your password is changed, previous active sessions will be signed out automatically.',
        'If you did not request a password reset, no action is needed.',
      ].join('\n'),
      html: renderAuthMailTemplate({
        eyebrow: 'Account Security',
        title: 'Reset your Tata Islem password',
        greeting: `Hello <strong>${user.firstName}</strong>, we received a request to reset your password.`,
        body:
          'Use the secure link below to choose a new password and regain access to your dashboard, bookings, invoices, and reminders.',
        ctaLabel: 'Choose a new password',
        ctaUrl: resetUrl,
        footer:
          'This reset link expires in 2 hours. Once your password is changed, any previous active sessions will be signed out automatically.',
        secondaryNote:
          'If you did not request a password reset, no action is needed. Your account stays protected until you use the link above.',
      }),
    }),
    'auth-password-reset',
  );
};
