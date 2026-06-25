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
            Thank you for starting your journey with MoneyHaven.<br>
            Please use the secure verification code below to complete your registration.
          </p>

          <div style="margin:30px 0;">
            <div style="display:inline-block; font-size:32px; font-weight:bold; letter-spacing:6px; color:#2563eb; background:#eff6ff; padding:16px 24px; border-radius:10px; border:2px dashed #bfdbfe;">
              ${otp}
            </div>
          </div>

          <p>
            This code will securely expire in <b>5 minutes</b>.<br>
            If you did not request this, please safely ignore this email.
          </p>
        </div>

        <div style="text-align:center;color:#999;font-size:12px;margin-top:25px;line-height:1.5;">
          © ${new Date().getFullYear()} MoneyHaven. All rights reserved.<br>
          Built with 💙 for personal finance.
        </div>
      </div>
    `;

    const payload = {
      sender: {
        name: "MoneyHaven",
        email: process.env.EMAIL || "noreply@moneyhaven.com"
      },
      to: [{ email: email }],
      subject: "MoneyHaven - Verify Your Email",
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