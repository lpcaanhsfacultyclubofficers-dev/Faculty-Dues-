import express from "express";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
