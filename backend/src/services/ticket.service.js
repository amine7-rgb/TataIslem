import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '../images/logo.jpeg');
const bgPath = path.join(__dirname, '../images/eventooldd.png');
const barcodePath = path.join(__dirname, '../images/codebar.png');

export const generateTicket = (reservation) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: [900, 300],
      margin: 0,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    const date = new Date(reservation.eventDate);

    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const formattedTime = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const seatText = `${String(reservation.seats || '01').padStart(2, '0')} SEAT`;
    const address = reservation.eventAddress || reservation.address || 'Address shared soon';

    doc.image(bgPath, 0, 0, { width: 680, height: 300 });
    doc.rect(0, 0, 680, 300).fillOpacity(0.25).fill('#000').fillOpacity(1);

    doc.rect(680, 0, 220, 300).fill('#000');

    doc
      .lineWidth(2)
      .dash(6, { space: 6 })
      .strokeColor('#fff')
      .moveTo(680, 0)
      .lineTo(680, 300)
      .stroke()
      .undash();

    doc.image(barcodePath, 730, 30, {
      width: 150,
      height: 240,
    });

    doc.image(logoPath, 30, 25, { width: 95 });

    doc.fillColor('#fff').fontSize(40).text(reservation.eventTitle.toUpperCase(), 160, 45, {
      width: 480,
      align: 'center',
    });

    doc.fontSize(18).fillColor('#ddd').text(address, 160, 100, {
      width: 480,
      align: 'center',
    });

    doc.roundedRect(250, 150, 230, 34, 12).fill('#fff');

    doc.fillColor('#000').fontSize(12).text(reservation.email, 250, 160, {
      width: 230,
      align: 'center',
    });

    doc.rect(0, 240, 680, 60).fill('#0a0a0a');

    doc.rect(80, 258, 18, 16).strokeColor('#fff').stroke();
    doc.rect(80, 252, 18, 4).fill('#fff');

    doc.fillColor('#fff').fontSize(14).text(formattedDate, 110, 258);

    doc.circle(350, 266, 9).stroke('#fff');
    doc.moveTo(350, 266).lineTo(350, 260).stroke('#fff');
    doc.moveTo(350, 266).lineTo(355, 266).stroke('#fff');

    doc.text(formattedTime, 370, 258);

    doc.fillColor('#D9A566').fontSize(14).text(seatText, 470, 258);

    doc.fillColor('#555').fontSize(8).text('Valid for entry • Non transferable', 700, 275, {
      width: 180,
      align: 'center',
    });

    doc.end();
  });
};
