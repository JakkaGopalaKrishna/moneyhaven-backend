const nodemailer = require('nodemailer');
const dns = require("dns");


const sendOtpEmail = async (email, otp) => {
  try {
    dns.setDefaultResultOrder("ipv4first");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      service: 'gmail',
      auth: {
        user: process.env.EMAIL || process.env.EMAIL_USER,
        pass: process.env.EMAIL_KEY || process.env.EMAIL_PASS,
      },
    });

    const htmlTemplate = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
        <div style="text-align: center; margin-bottom: 30px; padding-top: 10px;">
          <h1 style="color: #1677ff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">MoneyHaven</h1>
          <p style="color: #888; font-size: 14px; margin-top: 5px; font-weight: 500;">Take Control of Your Financial Future</p>
        </div>
        <div style="background-color: #f8fafc; padding: 40px 30px; border-radius: 12px; text-align: center;">
          <h2 style="color: #111827; font-size: 22px; margin-top: 0; margin-bottom: 15px; font-weight: 700;">Verify Your Email Address</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Thank you for starting your journey with MoneyHaven. Please use the secure verification code below to complete your registration.
          </p>
          <div style="margin: 30px 0;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; background-color: #eff6ff; padding: 20px 30px; border-radius: 12px; border: 2px dashed #bfdbfe; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This code will securely expire in <strong style="color: #374151;">5 minutes</strong>. <br/>If you did not request this, please safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} MoneyHaven. All rights reserved.<br/>
          Built with 💙 for personal finance.
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"MoneyHaven" <${process.env.EMAIL || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'MoneyHaven - Verify Your Email',
      text: `Your MoneyHaven verification code is: ${otp}\n\nThis OTP is valid for 5 minutes.`,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    // console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending email: ${error.message}`);
    // If credentials aren't set in development, we'll log the OTP to the console
    if (process.env.NODE_ENV !== 'production' && !(process.env.EMAIL || process.env.EMAIL_USER)) {
      // console.log(`\n[DEV MODE] EMAIL CREDENTIALS NOT SET. OTP IS: ${otp}\n`);
      return true;
    }
    throw new Error('Could not send OTP email');
  }
};

module.exports = {
  sendOtpEmail,
};
