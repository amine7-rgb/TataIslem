import Contact from '../models/Contact.js';
import { sendAdminMail, sendUserMail } from '../services/contactMail.service.js';

export const submitContactForm = async (req, res) => {
  try {
    const contact = await Contact.create(req.body);

    await sendAdminMail(contact);
    await sendUserMail(contact);

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
