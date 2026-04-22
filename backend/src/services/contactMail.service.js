import path from 'path';
import { fileURLToPath } from 'url';
import { buildMailFromAddress, sendMailWithDiagnostics } from './mail.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../images/logo.jpeg');

const contactLogoAttachment = [{ filename: 'logo.jpeg', path: logoPath, cid: 'logo' }];

export const sendAdminMail = async (contact) => {
  await sendMailWithDiagnostics(
    {
      from: buildMailFromAddress('Tata Islem'),
      to: process.env.MAIL_USER,
      subject: `New contact request from ${contact.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f4f4f4;border-radius:12px;">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="cid:logo" width="120" alt="Logo"/>
          </div>
          <h2 style="color:#D9A566;text-align:center;">New contact request</h2>
          <p><b>Name:</b> ${contact.name}</p>
          <p><b>Email:</b> ${contact.email}</p>
          <p><b>Phone:</b> ${contact.phone || 'N/A'}</p>
          <p><b>Message:</b><br>${contact.message}</p>
          <div style="margin-top:30px;text-align:center;color:#888;font-size:12px;">
            &copy; 2026 Tata Islem. All rights reserved.
          </div>
        </div>
      `,
      attachments: contactLogoAttachment,
    },
    'contact-admin',
  );
};

export const sendUserMail = async (contact) => {
  await sendMailWithDiagnostics(
    {
      from: buildMailFromAddress('Tata Islem'),
      to: contact.email,
      subject: 'We received your message',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f4f4f4;border-radius:12px;">
          <div style="text-align:center;margin-bottom:20px;">
            <img src="cid:logo" width="120" alt="Logo"/>
          </div>
          <h2 style="color:#D9A566;text-align:center;">Message received</h2>
          <p>Hello <b>${contact.name}</b>,</p>
          <p>We have received your message and our team will respond as soon as possible.</p>
          <p><b>Your message:</b><br>${contact.message}</p>
          <div style="margin-top:30px;text-align:center;color:#888;font-size:12px;">
            &copy; 2026 Tata Islem. All rights reserved.
          </div>
        </div>
      `,
      attachments: contactLogoAttachment,
    },
    'contact-user',
  );
};
