import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '../images/logo.jpeg');

export const generateInvoice = (reservation) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.image(logoPath, 50, 45, { width: 80 });

    doc.fontSize(22).fillColor('#D9A566').text('INVOICE', 200, 50);

    doc.moveDown(2);

    doc
      .fontSize(12)
      .fillColor('#000')
      .text(`Client: ${reservation.fullName}`)
      .text(`Email: ${reservation.email}`)
      .text(`Event: ${reservation.eventTitle}`)
      .text(`Date: ${new Date(reservation.eventDate).toLocaleDateString()}`)
      .text(`Seats: ${reservation.seats}`)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`);

    doc.moveDown(2);

    doc
      .rect(50, 220, 500, 30)
      .fill('#f2f2f2')
      .fillColor('#000')
      .text('Description', 60, 230)
      .text('Amount (EUR)', 430, 230);

    doc.moveTo(50, 250).lineTo(550, 250).stroke();

    const price = Number(reservation.amount || 0);

    doc.text(reservation.eventTitle, 60, 260).text(price.toFixed(2), 450, 260);

    doc.moveDown(4);

    doc.fontSize(14).text(`Total: EUR ${price.toFixed(2)}`, { align: 'right' });

    doc.moveDown(4);

    doc.fontSize(10).fillColor('#666').text('Thank you for your purchase!', { align: 'center' });

    doc.end();
  });
};
