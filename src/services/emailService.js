const nodemailer = require('nodemailer');

const sendOtpEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL || process.env.EMAIL_USER,
        pass: process.env.EMAIL_KEY || process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL || process.env.EMAIL_USER,
      to: email,
      subject: 'MoneyHaven Email Verification',
      text: `Your MoneyHaven verification code is:\n\n${otp}\n\nThis OTP is valid for 5 minutes.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending email: ${error.message}`);
    // If credentials aren't set in development, we'll log the OTP to the console
    if (process.env.NODE_ENV !== 'production' && !(process.env.EMAIL || process.env.EMAIL_USER)) {
      console.log(`\n[DEV MODE] EMAIL CREDENTIALS NOT SET. OTP IS: ${otp}\n`);
      return true;
    }
    throw new Error('Could not send OTP email');
  }
};

module.exports = {
  sendOtpEmail,
};
