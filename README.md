# 📈 Aggregator — AI-Powered Stock & Crypto News

A production-ready automated news aggregator that curates stock and cryptocurrency news for specific tickers, generates AI summaries via Claude, and sends real-time alerts to subscribers.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend API | Node.js + Express |
| Job Queue | BullMQ + Redis |
| Database | PostgreSQL + Prisma ORM |
| Auth | Clerk |
| Payments | Stripe |
| Email | Resend |
| AI | Anthropic Claude (Haiku + Sonnet) |
| Monorepo | Turborepo |

## Project Structure

```
/aggregator
├── apps/
│   ├── web/          # Next.js 14 frontend
│   ├── api/          # Express REST API
│   └── workers/      # BullMQ background processors
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── shared/       # Types, constants, utils
│   ├── ai/           # Claude summarization wrappers
│   └── scrapers/     # 6 news source adapters
├── docker-compose.yml
└── DECISIONS.md
```

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose

### 1. Clone & install

```bash
git clone <repo>
cd aggregator
cp .env.example .env
# Fill in your API keys (see Environment Variables section)
npm install
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Setup database

```bash
npm run db:generate
npm run db:migrate    # or db:push for development
npm run db:seed       # populates 1000+ sample articles across 50 tickers
```

### 4. Start all services

```bash
npm run dev
```

This starts:
- **Web** at http://localhost:3000
- **API** at http://localhost:4000
- **Workers** (background, no port)

## Full Docker Compose (Production)

```bash
cp .env.example .env
# Fill in all production values
docker compose up --build
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | From Clerk dashboard → Webhooks |
| `STRIPE_SECRET_KEY` | Stripe secret key (use `sk_test_` for dev) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard → Webhooks |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Stripe Price ID for Premium plan |
| `ANTHROPIC_API_KEY` | Claude API key |
| `CLAUDE_DAILY_SPEND_LIMIT_USD` | Hard cap (default: $10) |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | From address for emails |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage (free at alphavantage.co) |
| `FINNHUB_API_KEY` | Finnhub (free at finnhub.io) |
| `COINGECKO_API_KEY` | Optional (free tier works without) |
| `CRYPTOPANIC_API_KEY` | Optional (anonymous access works) |
| `VAPID_PUBLIC_KEY` | Web push (generate with `web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Web push private key |

## Subscription Tiers

| Tier | Price | Tickers | Real-time | API |
|---|---|---|---|---|
| Free | $0 | 3 | ✗ (24h delay) | ✗ |
| Pro | $19/mo | 50 | ✓ | ✗ |
| Premium | $49/mo | Unlimited | ✓ | ✓ |

All paid plans include a 7-day free trial via Stripe.

## News Sources

1. **Yahoo Finance RSS** — General market news + per-ticker feeds
2. **CoinGecko API** — Crypto news with coin tagging
3. **Finnhub API** — Real-time financial news with ticker metadata
4. **Alpha Vantage API** — News + pre-computed sentiment scores
5. **CryptoPanic API** — Crypto news aggregator with vote-based sentiment
6. **CoinDesk / Decrypt RSS** — In-depth crypto journalism

Scrapers run every 10 minutes via BullMQ. Each adapter outputs a normalized `NormalizedArticle` shape for consistent deduplication and ticker detection.

## Stripe Webhooks Setup

In Stripe Dashboard → Webhooks, add endpoint:
```
https://your-api-domain.com/webhooks/stripe
```

Subscribe to events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Clerk Webhooks Setup

In Clerk Dashboard → Webhooks, add endpoint:
```
https://your-api-domain.com/webhooks/clerk
```

Subscribe to:
- `user.created`
- `user.updated`
- `user.deleted`

## Deployment (Railway)

1. Connect GitHub repo to Railway
2. Create services: `web`, `api`, `workers`
3. Add PostgreSQL and Redis plugins
4. Set environment variables per service
5. Run migrations: `npm run db:migrate` in API service

## Admin Endpoints

Protected by `INTERNAL_API_SECRET` header:

- `GET /api/admin/stats` — Article counts, user counts, AI spend
- `POST /api/admin/articles/:id/hide` — Hide spam/low-quality content

## Legal

All content is for informational purposes only and does not constitute financial advice. We respect robots.txt and external API Terms of Service. Official APIs are preferred over scraping wherever available.

---

See `DECISIONS.md` for architecture decisions and trade-off rationale.
