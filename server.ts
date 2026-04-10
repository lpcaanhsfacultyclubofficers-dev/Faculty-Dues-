import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  pool: true, // Use connection pooling for faster delivery
  maxConnections: 10,
  maxMessages: Infinity,
});

// Verification logs for debugging
const verificationLogs: { email: string, code: string, timestamp: number, success: boolean, error?: string, type?: 'otp' | 'qr' }[] = [];

// Verify transporter on startup
console.log("[EMAIL] Verifying transporter configuration...");
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.warn("[EMAIL] GMAIL_USER or GMAIL_APP_PASSWORD not set. Emails will be simulated.");
} else {
  transporter.verify((error, success) => {
    if (error) {
      console.error("[EMAIL] Transporter verification failed:", error.message);
      console.error("[EMAIL] Error details:", JSON.stringify(error));
    } else {
      console.log("[EMAIL] Transporter is ready to deliver messages");
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for checking email status
  app.get("/api/email-status", (req, res) => {
    res.json({
      configured: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
      gmailUser: process.env.GMAIL_USER ? `${process.env.GMAIL_USER.substring(0, 3)}...${process.env.GMAIL_USER.split('@')[1]}` : null,
      hasAppPassword: !!process.env.GMAIL_APP_PASSWORD,
      nodeEnv: process.env.NODE_ENV,
      logs: verificationLogs.slice(-20).reverse()
    });
  });

  // API Route for sending QR codes
  app.post("/api/send-qr-code", (req, res) => {
    const { email, qrData, name } = req.body;

    if (!email || !qrData) {
      return res.status(400).json({ error: "Email and QR data are required." });
    }

    console.log(`[QR-SEND] QR Code requested for ${email}`);
    
    // Return success immediately to the client
    res.json({ success: true, message: "QR Code sending initiated." });

    const subject = "Your Faculty Club Login QR Code";
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0038A8; text-align: center;">Your Login QR Code</h2>
        <p>Hello ${name || 'Teacher'},</p>
        <p>Your secure login QR code has been generated. You can use this to log in to the Faculty Club portal instantly.</p>
        <div style="background: #f4f7ff; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
          <p style="font-size: 14px; color: #0038A8; font-weight: bold;">Login Credentials:</p>
          <p style="font-family: monospace; font-size: 12px; color: #666;">${qrData}</p>
          <p style="font-size: 11px; color: #999; margin-top: 10px;">(Please keep this information secure and do not share it with anyone.)</p>
        </div>
        <p>To log in, simply open the Faculty Club portal, click "QR Login", and scan your code.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 10px; text-align: center;">Las Piñas CAA National High School Faculty Club</p>
      </div>
    `;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("[QR-SEND] Email configuration missing. Simulating send.");
      verificationLogs.push({ email, code: 'QR_CODE', timestamp: Date.now(), success: true, error: "Simulated", type: 'qr' });
      return;
    }

    // Process in background
    transporter.sendMail({
      from: `"Las Piñas CAA Faculty Club" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
      priority: 'high',
    }).then((info) => {
      console.log(`[QR-SEND] QR Code sent successfully to ${email}`);
      verificationLogs.push({ email, code: 'QR_CODE', timestamp: Date.now(), success: true, type: 'qr' });
    }).catch((error) => {
      console.error(`[QR-SEND] Failed to send to ${email}:`, error.message);
      verificationLogs.push({ email, code: 'QR_CODE', timestamp: Date.now(), success: false, error: error.message, type: 'qr' });
    });
  });

  // API Route for sending receipts
  app.post("/api/send-receipt", async (req, res) => {
    console.log("Received request to /api/send-receipt");
    const { recipients, to, subject, html } = req.body;

    // Normalize recipients to an array
    let recipientList: string[] = [];
    if (Array.isArray(recipients)) {
      recipientList = recipients;
    } else if (typeof to === 'string') {
      recipientList = [to];
    }

    if (recipientList.length === 0) {
      console.error("No recipients provided. Body:", req.body);
      return res.status(400).json({ error: "No recipients provided." });
    }

    console.log(`Processing batch send to ${recipientList.length} recipients.`);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("Email configuration missing. Simulating batch email send.");
      return res.json({ 
        success: true, 
        simulated: true, 
        message: "Emails simulated because GMAIL_USER is not set." 
      });
    }

    // Create a promise for each email
    const emailPromises = recipientList.map(async (to) => {
      try {
        await transporter.sendMail({
          from: `"Las Piñas CAA Faculty Club" <${process.env.GMAIL_USER}>`,
          to,
          subject,
          html,
        });
        return { to, success: true };
      } catch (error: any) {
        console.error(`Failed to send to ${to}:`, error.message);
        return { to, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const summary = results.map((result) => result.status === 'fulfilled' ? result.value : { to: 'unknown', success: false, error: result.reason });

    const successful = summary.filter(s => s.success);
    const failed = summary.filter(s => !s.success);

    res.json({ 
      success: failed.length === 0, 
      summary,
      successfulCount: successful.length,
      failedCount: failed.length
    });
  });

  // API Route for sending verification codes
  app.post("/api/send-verification-code", (req, res) => {
    const { email, code, manual } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required." });
    }

    if (manual) {
      console.log(`[VERIFICATION] Manual code ${code} logged for ${email}`);
      verificationLogs.push({ email, code, timestamp: Date.now(), success: true, error: "Manual" });
      return res.json({ success: true, manual: true });
    }

    console.log(`[VERIFICATION] Code ${code} requested for ${email}`);
    
    // Return success immediately
    res.json({ success: true, message: "Verification code sending initiated." });

    const subject = "Faculty Club Login Verification Code";
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0038A8; text-align: center;">Login Verification</h2>
        <p>Hello,</p>
        <p>You are attempting to log in to the Faculty Club portal via QR code. Please use the following verification code:</p>
        <div style="background: #f4f7ff; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0038A8;">${code}</span>
        </div>
        <p style="color: #666; font-size: 12px;">This code is valid for 1 minute. If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 10px; text-align: center;">Las Piñas CAA National High School Faculty Club</p>
      </div>
    `;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("[VERIFICATION] Email configuration missing. Simulating send.");
      verificationLogs.push({ email, code, timestamp: Date.now(), success: true, error: "Simulated", type: 'otp' });
      return;
    }

    // Process in background
    transporter.sendMail({
      from: `"Las Piñas CAA Faculty Club" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
      priority: 'high',
    }).then((info) => {
      console.log(`[VERIFICATION] Mail sent successfully to ${email}. MessageId: ${info.messageId}`);
      verificationLogs.push({ email, code, timestamp: Date.now(), success: true, type: 'otp' });
    }).catch((error) => {
      console.error(`[VERIFICATION] Failed to send to ${email}:`, error.message);
      verificationLogs.push({ email, code, timestamp: Date.now(), success: false, error: error.message, type: 'otp' });
    });
  });

  // API Route for sending payment reminders
  app.post("/api/send-reminder", async (req, res) => {
    const { email, name, gender, pendingDues, totalBalance } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required." });
    }

    console.log(`[REMINDER] Sending reminder to ${email}`);

    const salutation = gender === 'Male' ? 'Sir' : gender === 'Female' ? 'Ma\'am' : 'Sir/Ma\'am';
    const subject = "Faculty Club: A Gentle Reminder Regarding Your Dues";
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1a202c; line-height: 1.8; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 35px;">
          <div style="background: linear-gradient(135deg, #0038A8, #0052cc); width: 70px; height: 70px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0, 56, 168, 0.2);">
            <span style="color: white; font-size: 34px; font-weight: bold;">₱</span>
          </div>
          <h2 style="color: #0038A8; margin: 0; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Payment Reminder</h2>
        </div>

        <p style="font-size: 16px; color: #2d3748;">Good day, <strong>${salutation} ${name}</strong>,</p>
        
        <p style="font-size: 16px; color: #4a5568;">We hope this email finds you well and having a wonderful day.</p>
        
        <p style="font-size: 16px; color: #4a5568;">This is a gentle and polite reminder from the <strong>Las Piñas CAA National High School Faculty Club</strong> regarding your outstanding required dues. Your continued support is highly appreciated and vital to the success of our club's initiatives.</p>
        
        <p style="font-size: 16px; color: #4a5568;">Our records indicate that the following required items are currently pending for your account:</p>

        <div style="background: #f8fafc; padding: 30px; border-radius: 16px; margin: 30px 0; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; font-size: 13px; color: #718096; text-transform: uppercase; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; letter-spacing: 0.5px;">Description</th>
                <th style="text-align: right; font-size: 13px; color: #718096; text-transform: uppercase; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; letter-spacing: 0.5px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${pendingDues.map((due: any) => `
                <tr>
                  <td style="padding: 16px 0; font-size: 15px; font-weight: 600; color: #2d3748; border-bottom: 1px solid #edf2f7;">${due.name}</td>
                  <td style="padding: 16px 0; font-size: 15px; font-weight: 700; color: #2d3748; text-align: right; border-bottom: 1px solid #edf2f7;">₱${due.amount}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding-top: 20px; font-size: 17px; font-weight: 800; color: #0038A8;">Total Outstanding</td>
                <td style="padding-top: 20px; font-size: 20px; font-weight: 900; color: #0038A8; text-align: right;">₱${totalBalance}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p style="font-size: 15px; color: #718096; font-style: italic; background: #fffaf0; padding: 20px; border-radius: 12px; border-left: 5px solid #f6ad55; line-height: 1.7;">
          <strong>Note:</strong> We kindly request your assistance in settling these required dues at your earliest convenience. If you have already made a payment, please disregard this message or kindly provide us with a copy of your receipt for verification.
        </p>

        <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 16px; color: #4a5568; margin-bottom: 8px;">Thank you very much for your time, continued support, and cooperation.</p>
          <p style="font-size: 16px; font-weight: 700; color: #0038A8; margin: 0;">LPC AA NHS Faculty Club Officers</p>
        </div>

        <div style="margin-top: 50px; text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px;">
          <p style="color: #a0aec0; font-size: 12px; margin: 0; font-weight: 600;">Las Piñas CAA National High School</p>
          <p style="color: #a0aec0; font-size: 12px; margin: 8px 0 0 0;">This is an automated reminder. Please do not reply directly to this email.</p>
        </div>
      </div>
    `;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("[REMINDER] Email configuration missing. Simulating send.");
      return res.json({ success: true, simulated: true });
    }

    try {
      await transporter.sendMail({
        from: `"Las Piñas CAA Faculty Club" <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[REMINDER] Failed to send to ${email}:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
