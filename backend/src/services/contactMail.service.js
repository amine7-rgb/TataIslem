import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../images/logo.jpeg');

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false, // false pour port 587 (TLS)
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: true, // à garder en dev
  },
});

export const sendAdminMail = async (contact) => {
  await transporter.sendMail({
    from: `"Contact Form" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_USER,
    subject: `New Contact Form Submission from ${contact.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f4f4f4;border-radius:12px;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="cid:logo" width="120" alt="Logo"/>
        </div>
        <h2 style="color:#D9A566;text-align:center;">New Contact Form</h2>
        <p><b>Name:</b> ${contact.name}</p>
        <p><b>Email:</b> ${contact.email}</p>
        <p><b>Phone:</b> ${contact.phone || 'N/A'}</p>
        <p><b>Message:</b><br>${contact.message}</p>
        <div style="margin-top:30px;text-align:center;color:#888;font-size:12px;">
          © 2026 Event Team. All rights reserved.
        </div>
      </div>
    `,
    attachments: [{ filename: 'logo.png', path: logoPath, cid: 'logo' }],
  });
};

export const sendUserMail = async (contact) => {
  await transporter.sendMail({
    from: `"Event Team" <${process.env.MAIL_USER}>`,
    to: contact.email,
    subject: 'Your message has been received',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f4f4f4;border-radius:12px;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="cid:logo" width="120" alt="Logo"/>
        </div>
        <h2 style="color:#D9A566;text-align:center;">Message Received</h2>
        <p>Hello <b>${contact.name}</b>,</p>
        <p>We have received your message and our team will respond as soon as possible.</p>
        <p><b>Your message:</b><br>${contact.message}</p>
        <div style="margin-top:30px;text-align:center;color:#888;font-size:12px;">
          © 2026 Event Team. All rights reserved.
        </div>
      </div>
    `,
    attachments: [{ filename: 'logo.png', path: logoPath, cid: 'logo' }],
  });
};
