const sendOtpEmail = async (email, otp) => {
  try {
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

    const payload = {
      sender: { 
        name: "MoneyHaven", 
        email: process.env.EMAIL_USER || "noreply@moneyhaven.com" 
      },
      to: [{ email: email }],
      subject: "MoneyHaven - Email Verification",
      htmlContent: htmlTemplate
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();
    console.log("OTP email sent successfully via Brevo. Message ID:", data.messageId);

    return true;
  } catch (error) {
    console.error("Error sending email via Brevo REST API:", error.message);

    // Fallback logging for Development if API Key is missing
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env.BREVO_API_KEY
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