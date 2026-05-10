const nodemailer = require('nodemailer');

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendLoginLink(email, loginUrl) {
  const transporter = getTransporter();
  const subject = '$STACK secure dashboard login link';
  const text = `Use this secure link to access your $STACK dashboard:\n\n${loginUrl}\n\nThis link expires in 15 minutes.`;
  const html = `<p>Use this secure link to access your <strong>$STACK</strong> dashboard:</p><p><a href="${loginUrl}">Access $STACK Dashboard</a></p><p>This link expires in 15 minutes.</p>`;

  if (!transporter) {
    console.log('SMTP not configured. Login link:', loginUrl);
    return { sent: false, devLoginUrl: loginUrl };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"$STACK Access" <no-reply@example.com>',
    to: email,
    subject,
    text,
    html
  });
  return { sent: true };
}

module.exports = { sendLoginLink, smtpConfigured };
