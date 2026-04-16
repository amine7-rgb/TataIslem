import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '../images/logo.jpeg');

const escapeXml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const safeFileLabel = (value) =>
  String(value || 'all')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'all';

const formatDateTime = (value) => {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatAmount = (value) => `EUR ${Number(value || 0).toFixed(2)}`;

export const buildAdminBookingsExportFilename = ({ type, format }) => {
  const today = new Date().toISOString().slice(0, 10);
  const extension = format === 'pdf' ? 'pdf' : 'xls';
  return `tataislem-bookings-${safeFileLabel(type)}-${today}.${extension}`;
};

export const generateAdminBookingsPdf = ({ items, stats, title }) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 44, size: 'A4' });
    const buffers = [];
    let cursorY = 182;

    const drawHeaderRow = () => {
      doc
        .fillColor('#f3eee6')
        .roundedRect(44, cursorY, 508, 26, 10)
        .fill();

      doc
        .fillColor('#183b59')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('TYPE', 54, cursorY + 8, { width: 56 })
        .text('CLIENT', 112, cursorY + 8, { width: 120 })
        .text('BOOKING', 232, cursorY + 8, { width: 116 })
        .text('STATUS', 350, cursorY + 8, { width: 86 })
        .text('AMOUNT', 438, cursorY + 8, { width: 54, align: 'right' })
        .text('DATE', 494, cursorY + 8, { width: 48 });

      cursorY += 38;
    };

    const ensureSpace = (requiredHeight = 64) => {
      if (cursorY + requiredHeight <= 770) {
        return;
      }

      doc.addPage();
      cursorY = 54;
      drawHeaderRow();
    };

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.image(logoPath, 44, 34, { width: 78 });

    doc
      .fillColor('#d7b46f')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('BOOKINGS REPORT', 142, 42);

    doc
      .fillColor('#183b59')
      .fontSize(11)
      .font('Helvetica')
      .text(title, 142, 72)
      .fillColor('#6f7d88')
      .text(`Generated ${formatDateTime(new Date())}`, 142, 90);

    const summaryCards = [
      { label: 'Total', value: stats.totalBookings },
      { label: 'Events', value: stats.eventReservations },
      { label: 'Services', value: stats.serviceReservations },
      { label: 'Clients', value: stats.uniqueClients },
    ];

    summaryCards.forEach((card, index) => {
      const x = 44 + index * 128;

      doc
        .fillColor('#f7f3ec')
        .roundedRect(x, 122, 116, 48, 14)
        .fill()
        .fillColor('#6f7d88')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(card.label.toUpperCase(), x + 12, 134, { width: 92 })
        .fillColor('#183b59')
        .fontSize(18)
        .text(String(card.value ?? 0), x + 12, 148, { width: 92 });
    });

    drawHeaderRow();

    if (!items.length) {
      doc
        .fillColor('#183b59')
        .fontSize(11)
        .font('Helvetica')
        .text('No reservations match the current filter.', 54, cursorY + 6);
      doc.end();
      return;
    }

    items.forEach((item, index) => {
      ensureSpace();

      const blockHeight = 56;
      const background = index % 2 === 0 ? '#ffffff' : '#fbf8f2';

      doc
        .fillColor(background)
        .roundedRect(44, cursorY - 6, 508, blockHeight, 16)
        .fill();

      doc
        .fillColor('#183b59')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(item.typeLabel, 54, cursorY + 2, { width: 48 })
        .text(item.clientName, 112, cursorY + 2, { width: 112 })
        .text(item.bookingTitle, 232, cursorY + 2, { width: 110 })
        .text(item.statusLabel, 350, cursorY + 2, { width: 80 })
        .text(formatAmount(item.amount), 438, cursorY + 2, { width: 54, align: 'right' });

      doc
        .fillColor('#6f7d88')
        .fontSize(8.5)
        .font('Helvetica')
        .text(item.email, 112, cursorY + 22, { width: 112 })
        .text(item.secondaryLine, 232, cursorY + 22, { width: 182 })
        .text(formatDateTime(item.createdAt), 424, cursorY + 22, {
          width: 118,
          align: 'right',
        });

      cursorY += 62;
    });

    doc.end();
  });
};

export const generateAdminBookingsSpreadsheet = ({ items, stats, title }) => {
  const rows = [
    ['Report', title],
    ['Generated At', formatDateTime(new Date())],
    ['Total Bookings', stats.totalBookings],
    ['Event Reservations', stats.eventReservations],
    ['Service Reservations', stats.serviceReservations],
    ['Unique Clients', stats.uniqueClients],
    ['Total Revenue', Number(stats.totalRevenue || 0).toFixed(2)],
    [],
    [
      'Type',
      'Client',
      'Email',
      'Phone',
      'Booking',
      'Status',
      'Amount (EUR)',
      'Scheduled For',
      'Created At',
    ],
    ...items.map((item) => [
      item.typeLabel,
      item.clientName,
      item.email,
      item.phoneNumber,
      item.bookingTitle,
      item.statusLabel,
      Number(item.amount || 0).toFixed(2),
      item.secondaryLine,
      formatDateTime(item.createdAt),
    ]),
  ];

  const xmlRows = rows
    .map(
      (row) => `
      <Row>
        ${row
          .map(
            (cell) => `
          <Cell><Data ss:Type="${
            typeof cell === 'number' ? 'Number' : 'String'
          }">${escapeXml(cell ?? '')}</Data></Cell>`,
          )
          .join('')}
      </Row>`,
    )
    .join('');

  return Buffer.from(
    `<?xml version="1.0"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="Bookings">
    <Table>
      ${xmlRows}
    </Table>
  </Worksheet>
</Workbook>`,
    'utf8',
  );
};
