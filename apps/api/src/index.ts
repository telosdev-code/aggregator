import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { logger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { tickersRouter } from "./routes/tickers.js";
import { articlesRouter } from "./routes/articles.js";
import { watchlistRouter } from "./routes/watchlist.js";
import { usersRouter } from "./routes/users.js";
import { stripeWebhookRouter } from "./routes/stripe-webhook.js";
import { clerkWebhookRouter } from "./routes/clerk-webhook.js";
import { pushRouter } from "./routes/push.js";
import { adminRouter } from "./routes/admin.js";
import { alertsRouter } from "./routes/alerts.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

// Stripe webhook needs raw body — mount before json parser
app.use("/webhooks/stripe", stripeWebhookRouter);

app.use(helmet());
app.use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL ?? "*", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(logger);

// Global rate limit: 300 req/min per IP
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

app.use("/api/tickers", tickersRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/users", usersRouter);
app.use("/api/push", pushRouter);
app.use("/api/admin", adminRouter);
app.use("/api/alerts", alertsRouter);
app.use("/webhooks/clerk", clerkWebhookRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;
