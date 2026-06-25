const nodemailer = require("nodemailer");
const dns = require("dns");

// Force Node.js to prefer IPv4 over IPv6
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4, // Force IPv4

  auth: {
    user: process.env.EMAIL || process.env.EMAIL_USER,
    pass: process.env.EMAIL_KEY || process.env.EMAIL_PASS,
  },

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,

  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },
});

const sendOtpEmail = async (email, otp) => {
  try {
    // Verify SMTP connection
    await transporter.verify();
    console.log("SMTP server connected.");

    const htmlTemplate = `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.05);border:1px solid #f0f0f0;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#1677ff;">MoneyHaven</h1>
          <p style="color:#777;">Take Control of Your Financial Future</p>
        </div>

        <div style="background:#f8fafc;padding:40px;border-radius:12px;text-align:center;">
          <h2>Verify Your Email Address</h2>

          <p>
            Thank you for signing up with MoneyHaven.
            Use the OTP below to verify your email.
          </p>

          <div style="margin:30px 0;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;background:#eff6ff;padding:20px 30px;border-radius:10px;border:2px dashed #bfdbfe;">
              ${otp}
            </span>
          </div>

          <p>
            This OTP expires in <b>5 minutes</b>.
          </p>
        </div>

        <div style="text-align:center;color:#999;font-size:12px;margin-top:25px;">
          © ${new Date().getFullYear()} MoneyHaven
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"MoneyHaven" <${process.env.EMAIL || process.env.EMAIL_USER}>`,
      to: email,
      subject: "MoneyHaven - Email Verification",
      text: `Your verification OTP is ${otp}. This OTP is valid for 5 minutes.`,
      html: htmlTemplate,
    });

    console.log("OTP email sent successfully.");

    return true;
  } catch (error) {
    console.error("Error sending email:", error);

    if (
      process.env.NODE_ENV !== "production" &&
      !(process.env.EMAIL || process.env.EMAIL_USER)
    ) {
      console.log("Development Mode OTP:", otp);
      return true;
    }

    throw new Error("Could not send OTP email");
  }
};

module.exports = {
  sendOtpEmail,
};