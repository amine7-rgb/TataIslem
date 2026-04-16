import cron from 'node-cron';
import Reservation from '../models/Reservation.js';
import ServiceOrder from '../models/ServiceOrder.js';
import {
  sendConfirmationMail,
  sendServiceMeetingReminderMail,
} from '../services/mail.service.js';

const buildDayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const startReminderJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();

      const { start: startToday, end: endToday } = buildDayRange(now);

      const threeDays = new Date(now);
      threeDays.setDate(now.getDate() + 3);
      const { start: start3Days, end: end3Days } = buildDayRange(threeDays);

      const reminder3Days = await Reservation.find({
        eventDate: { $gte: start3Days, $lte: end3Days },
        reminder3DaysSent: false,
      });

      for (const reservation of reminder3Days) {
        await sendConfirmationMail(reservation, '3days');
        reservation.reminder3DaysSent = true;
        await reservation.save();
      }

      const reminderToday = await Reservation.find({
        eventDate: { $gte: startToday, $lte: endToday },
        reminderDaySent: false,
      });

      for (const reservation of reminderToday) {
        await sendConfirmationMail(reservation, 'day');
        reservation.reminderDaySent = true;
        await reservation.save();
      }

      const serviceMeetingsToday = await ServiceOrder.find({
        paymentStatus: 'paid',
        scheduleStatus: 'confirmed',
        'currentSlot.startAt': { $gte: startToday, $lte: endToday },
      });

      let clientMeetingReminders = 0;
      let adminMeetingReminders = 0;

      for (const order of serviceMeetingsToday) {
        if (!order.meetingReminderClientSent) {
          await sendServiceMeetingReminderMail(order, 'client');
          order.meetingReminderClientSent = true;
          clientMeetingReminders += 1;
        }

        if (!order.meetingReminderAdminSent) {
          await sendServiceMeetingReminderMail(order, 'admin');
          order.meetingReminderAdminSent = true;
          adminMeetingReminders += 1;
        }

        if (order.isModified()) {
          await order.save();
        }
      }

      console.log(
        `Reminder job done - events J-3: ${reminder3Days.length}, events today: ${reminderToday.length}, service client reminders: ${clientMeetingReminders}, service admin reminders: ${adminMeetingReminders}`,
      );
    } catch (error) {
      console.error('Reminder cron error:', error);
    }
  });
};
