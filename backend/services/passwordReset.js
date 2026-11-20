const crypto = require('crypto');
const { Resend } = require('resend');

function createResetToken() {
  const token = crypto.randomBytes(32).toString('hex');

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return { token, tokenHash };
}

async function sendPasswordResetEmail({ to, token, accountType }) {
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL ||
    !process.env.FRONTEND_URL
  ) {
    throw new Error('Password reset email configuration is incomplete.');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const resetUrl = new URL(
    '/reset-password',
    process.env.FRONTEND_URL
  );

  resetUrl.searchParams.set('token', token);
  resetUrl.searchParams.set('type', accountType);

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [to],
    subject: 'Reset your GMM password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
        <h2>Global Manufacturer Matchmaker</h2>
        <p>We received a request to reset the password for your ${accountType} account.</p>
        <p>
          <a href="${resetUrl.toString()}"
             style="display:inline-block;padding:12px 22px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">
            Reset Password
          </a>
        </p>
        <p>This link expires in 30 minutes and can only be used once.</p>
        <p>If you did not request this change, you can safely ignore this email.</p>
        <p>GMM Support</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || 'Email delivery failed.');
  }

  return data;
}

module.exports = {
  createResetToken,
  sendPasswordResetEmail,
};
