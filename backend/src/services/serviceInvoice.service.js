import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '../images/logo.jpeg');

export const generateServiceInvoice = (order) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.image(logoPath, 50, 45, { width: 80 });

    doc.fontSize(22).fillColor('#D9A566').text('SERVICE INVOICE', 200, 50);

    doc.moveDown(2);

    doc
      .fontSize(12)
      .fillColor('#000')
      .text(`Client: ${order.fullName}`)
      .text(`Email: ${order.email}`)
      .text(`Phone: ${order.phoneNumber}`)
      .text(`Service: ${order.serviceTitle}`)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`);

    doc.moveDown(2);

    doc
      .rect(50, 220, 500, 30)
      .fill('#f2f2f2')
      .fillColor('#000')
      .text('Description', 60, 230)
      .text('Amount (€)', 450, 230);

    doc.moveTo(50, 250).lineTo(550, 250).stroke();

    doc.text(order.serviceTitle, 60, 260).text(order.amount.toFixed(2), 450, 260);

    doc.moveDown(4);

    doc.fontSize(14).text(`Total: €${order.amount}`, { align: 'right' });

    doc.moveDown(4);

    doc.fontSize(10).fillColor('#666').text('Thank you for your purchase!', { align: 'center' });

    doc.end();
  });
};
