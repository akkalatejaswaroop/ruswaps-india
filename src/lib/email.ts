import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function sanitizeForHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

function sanitizeOtp(otp: string): string {
  if (!otp || typeof otp !== 'string') return '';
  return otp.replace(/[^0-9]/g, '').slice(0, 10);
}

export async function sendOTPEmail(email: string, otp: string, name: string) {
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedOtp = sanitizeOtp(otp);
  const sanitizedName = sanitizeForHtml(name);

  if (!sanitizedEmail || !sanitizedOtp) {
    console.error('Email sending failed: invalid email or OTP');
    return false;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: sanitizedEmail,
    subject: 'Ruswaps - Verify Your Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 20px; }
          .otp { font-size: 36px; font-weight: bold; color: #017c43; text-align: center; letter-spacing: 8px; margin: 30px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <h2 style="color: #017c43; margin: 0;">Ruswaps</h2>
            </div>
            <p>Hello <strong>${sanitizedName}</strong>,</p>
            <p>Thank you for registering with Ruswaps. Please verify your account with the OTP below:</p>
            <div class="otp">${sanitizedOtp}</div>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Ruswaps India. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', { code: 'EMAIL_SEND_FAILED', timestamp: new Date().toISOString() });
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedName = sanitizeForHtml(name);

  if (!sanitizedEmail) {
    console.error('Welcome email failed: invalid email');
    return false;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: sanitizedEmail,
    subject: 'Welcome to Ruswaps - Account Verified',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .features { list-style: none; padding: 0; }
          .features li { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
          .features li:before { content: "\\2713"; color: #017c43; margin-right: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h2 style="color: #017c43; text-align: center;">Welcome to Ruswaps!</h2>
            <p>Hello <strong>${sanitizedName}</strong>,</p>
            <p>Your account has been successfully verified. You now have access to all our legal calculators and features.</p>
            <h3>What you can do:</h3>
            <ul class="features">
              <li>Calculate MVA Claims Compensation</li>
              <li>Calculate Employee Compensation</li>
              <li>Calculate Disability Benefits</li>
              <li>Calculate Income Tax on Interest</li>
              <li>Track Case Directions</li>
              <li>Download PDF Reports</li>
            </ul>
            <p style="text-align: center; margin-top: 20px;">
              <a href="https://ruswaps.in/dashboard" style="background: #017c43; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
            </p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Ruswaps India. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Welcome email failed:', { code: 'WELCOME_EMAIL_FAILED', timestamp: new Date().toISOString() });
    return false;
  }
}
