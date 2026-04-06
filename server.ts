import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending receipts
  app.post("/api/send-receipt", async (req, res) => {
    const { to, subject, html } = req.body;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("Email configuration missing. Simulating email send.");
      console.log(`--- SIMULATED EMAIL ---`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML length: ${html?.length} characters`);
      console.log(`-----------------------`);
      return res.json({ 
        success: true, 
        simulated: true, 
        message: "Email simulated because GMAIL_USER is not set in environment variables." 
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: `"Las Piñas CAA Faculty Club" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Email Error Details:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
      res.status(500).json({ 
        error: "Failed to send email.",
        details: error.message,
        hint: "Ensure you are using a 16-character Gmail App Password, not your regular password."
      });
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
