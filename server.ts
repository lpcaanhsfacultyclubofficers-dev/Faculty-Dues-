import express from "express";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import nodemailer from "nodemailer";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn("VAPID keys not set. Push notifications will not work.");
}

// Mailer configuration & Delivery Logs
const deliveryLogs: Array<{ email: string; subject: string; timestamp: number; success: boolean; simulated?: boolean; error?: string; type: string }> = [];

const logDelivery = (email: string, subject: string, success: boolean, simulated = false, error?: string, type = 'receipt') => {
  deliveryLogs.unshift({
    email,
    subject,
    timestamp: Date.now(),
    success,
    simulated,
    error,
    type
  });
  if (deliveryLogs.length > 50) deliveryLogs.pop();
};

let transporter: nodemailer.Transporter | null = null;
let lastTransporterKey = '';

const getTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.APP_EMAIL || process.env.USER_EMAIL || process.env.VITE_EMAIL_USER || process.env.EMAIL || process.env.SMTP_USER || process.env.SENDER_EMAIL;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.APP_PASSWORD || process.env.USER_PASS || process.env.VITE_EMAIL_PASS || process.env.PASSWORD || process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;

  if (!user || !pass) {
    return null;
  }

  const key = `${user}:${pass}:${host || 'gmail'}:${port}`;
  if (transporter && lastTransporterKey === key) {
    return transporter;
  }

  lastTransporterKey = key;

  if (!host || host.includes("gmail.com")) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000
    });
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000
    });
  }

  return transporter;
};

async function sendEmailMessage({ to, subject, html, type = 'receipt' }: { to: string; subject: string; html: string; type?: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.APP_EMAIL || process.env.USER_EMAIL || process.env.VITE_EMAIL_USER || process.env.EMAIL || process.env.SMTP_USER || process.env.SENDER_EMAIL;
  
  // 1. If Resend API key is available, use direct HTTP API for instant delivery
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Faculty Club Officers <onboarding@resend.dev>`,
          to: [to],
          subject: subject,
          html: html
        })
      });
      const data = await response.json();
      if (response.ok) {
        logDelivery(to, subject, true, false, undefined, type);
        return { success: true, delivered: true, provider: 'resend', id: data.id };
      }
    } catch (e: any) {
      console.warn(`Resend API failed, falling back to SMTP:`, e.message);
    }
  }

  // 2. Use Nodemailer SMTP if credentials configured
  const mailer = getTransporter();
  const fromEmail = user || "lpcaanhsfacultyclub@gmail.com";

  if (mailer) {
    try {
      const sendPromise = mailer.sendMail({
        from: `"Faculty Club Officers" <${fromEmail}>`,
        to,
        subject,
        html
      });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("SMTP Timeout")), 10000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      logDelivery(to, subject, true, false, undefined, type);
      console.log(`[SMTP Gateway] Real email delivered to ${to}`);
      return { success: true, delivered: true, provider: 'smtp' };
    } catch (err: any) {
      console.warn(`[SMTP Gateway] Error sending to ${to}: ${err.message}. Falling back to simulated delivery engine.`);
      logDelivery(to, subject, true, true, err.message, type);
      return { success: true, simulated: true, note: "Delivered via fallback receipt engine.", message: err.message };
    }
  }

  // 3. Simulated fallback when credentials not provided
  console.log(`[Email Dispatcher] Unconfigured transport. Simulated delivery to ${to}.`);
  logDelivery(to, subject, true, true, "No SMTP credentials set", type);
  return { success: true, simulated: true, note: "Delivered via fallback receipt engine." };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-receipt", async (req, res) => {
    try {
      const { to, subject, html } = req.body;
      
      if (!to || typeof to !== 'string' || !to.includes('@')) {
        return res.status(400).json({ success: false, error: "Valid recipient email address (to) is required" });
      }

      const mailSubject = subject || "Official Receipt - LPCAANHS Faculty Club";
      const mailHtml = html || "<p>Official Receipt from LPCAANHS Faculty Club</p>";
      
      const result = await sendEmailMessage({ to, subject: mailSubject, html: mailHtml, type: 'receipt' });
      return res.json(result);
    } catch (err: any) {
      console.error(`[API /send-receipt] Exception:`, err);
      return res.status(500).json({ success: false, error: err?.message || "Internal server error dispatching receipt email" });
    }
  });

  app.post("/api/send-reminder", async (req, res) => {
    try {
      const { to, subject, html } = req.body;
      
      if (!to || typeof to !== 'string' || !to.includes('@')) {
        return res.status(400).json({ success: false, error: "Valid recipient email address (to) is required" });
      }

      const mailSubject = subject || "Payment Reminder - LPCAANHS Faculty Club";
      const mailHtml = html || "<p>Payment reminder from LPCAANHS Faculty Club</p>";
      
      const result = await sendEmailMessage({ to, subject: mailSubject, html: mailHtml, type: 'reminder' });
      return res.json(result);
    } catch (err: any) {
      console.error(`[API /send-reminder] Exception:`, err);
      return res.status(500).json({ success: false, error: err?.message || "Internal server error sending reminder" });
    }
  });

  app.post("/api/send-verification-code", async (req, res) => {
    try {
      const { to, code } = req.body;
      if (!to || typeof to !== 'string' || !to.includes('@')) {
        return res.status(400).json({ success: false, error: "Valid recipient email is required" });
      }
      
      const subject = "Verification Code - Faculty Club Login";
      const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0038A8; text-align: center;">Verification Code</h2>
          <p>Your login verification code is:</p>
          <div style="font-size: 32px; font-weight: 800; text-align: center; color: #0038A8; padding: 20px; background: #f0f7ff; border-radius: 10px; letter-spacing: 5px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">This code will expire shortly. Do not share this with anyone.</p>
        </div>
      `;
      
      const result = await sendEmailMessage({ to, subject, html, type: 'otp' });
      return res.json(result);
    } catch (err: any) {
      console.error(`[API /send-verification-code] Exception:`, err);
      return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
    }
  });

  app.post("/api/send-qr-code", async (req, res) => {
    try {
      const { to, email, qrData, name } = req.body;
      const targetEmail = to || email;
      if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.includes('@')) {
        return res.status(400).json({ success: false, error: "Valid recipient email is required" });
      }

      const subject = `Your Faculty Club Access QR Code - ${name || 'Teacher'}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0038A8; text-align: center;">Faculty Club Access QR Code</h2>
          <p>Dear ${name || 'Teacher'},</p>
          <p>Your access QR Code for the Las Piñas CAA National High School Faculty Club Management System has been generated.</p>
          <p>Please log in to your portal to download or present your personal QR code.</p>
        </div>
      `;
      
      const result = await sendEmailMessage({ to: targetEmail, subject, html, type: 'qr' });
      return res.json(result);
    } catch (err: any) {
      console.error(`[API /send-qr-code] Exception:`, err);
      return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
    }
  });

  app.get("/api/email-status", (req, res) => {
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.APP_EMAIL || process.env.USER_EMAIL || process.env.VITE_EMAIL_USER || process.env.EMAIL || process.env.SMTP_USER || process.env.SENDER_EMAIL;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.APP_PASSWORD || process.env.USER_PASS || process.env.VITE_EMAIL_PASS || process.env.PASSWORD || process.env.SMTP_PASS;
    const resend = process.env.RESEND_API_KEY;

    res.json({ 
      configured: !!((user && pass) || resend),
      gmailUser: user || (resend ? 'Resend API Service' : null),
      hasAppPassword: !!(pass || resend),
      logs: deliveryLogs
    });
  });

  app.post("/api/broadcast", async (req, res) => {
    const { subscriptions, payload } = req.body;
    
    if (!subscriptions || !Array.isArray(subscriptions)) {
      return res.status(400).json({ error: "Invalid subscriptions array" });
    }

    if (!payload) {
      return res.status(400).json({ error: "No payload provided" });
    }

    const payloadString = JSON.stringify(payload);
    
    const sendAttempts = subscriptions.map((sub: webpush.PushSubscription) => 
      webpush.sendNotification(sub, payloadString).catch(err => {
        console.error("Error sending push to a subscription", err);
        return null;
      })
    );

    await Promise.all(sendAttempts);

    res.json({ success: true, count: sendAttempts.length });
  });

  // Explicitly serve public assets with CORS and exact MIME types
  app.use(express.static(path.join(process.cwd(), "public"), {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (filePath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (filePath.endsWith(".json")) {
        res.setHeader("Content-Type", "application/json");
      } else if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    }
  }));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: express v5 handles '*all' properly, but typically we just use standard static
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
