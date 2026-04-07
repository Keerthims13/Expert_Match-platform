import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('Mail transport not configured. Skipping email notification.');
    return { skipped: true };
  }

  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    text,
    html
  });

  return { skipped: false };
}

export const mailService = {
  async sendStudentRequestAccepted({ studentEmail, studentName, expertName, doubtTitle, sessionId }) {
    if (!studentEmail) return { skipped: true };

    const safeStudent = String(studentName || 'Student').trim();
    const safeExpert = String(expertName || 'Expert').trim();
    const safeTitle = String(doubtTitle || 'your doubt').trim();

    const subject = `Chat request accepted by ${safeExpert}`;
    const text = `Hi ${safeStudent},\n\nYour chat request for "${safeTitle}" has been accepted by ${safeExpert}.\nSession #${sessionId} is now ready. Please open Sessions Chat to continue.\n\nRegards,\nExpertMatch`;
    const html = `<p>Hi ${safeStudent},</p><p>Your chat request for <strong>${safeTitle}</strong> has been accepted by <strong>${safeExpert}</strong>.</p><p>Session <strong>#${sessionId}</strong> is now ready. Please open Sessions Chat to continue.</p><p>Regards,<br/>ExpertMatch</p>`;

    return sendMail({ to: studentEmail, subject, text, html });
  }
};
