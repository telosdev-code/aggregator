# Architecture & Technology Decisions

## Auth: Clerk (vs Supabase Auth)
Clerk was chosen for its significantly cleaner Next.js App Router integration, pre-built UI components (SignIn/SignUp/UserButton), and straightforward webhook-based user sync. The `@clerk/nextjs` v5 SDK integrates natively with App Router server components and middleware without custom wrappers.

## Email: Resend (vs Postmark)
Resend has a simpler API for React/TypeScript projects, a generous free tier (3,000 emails/mo), and first-class Node.js SDK. HTML email templates are written by hand for full control.

## Job Queue: BullMQ (vs Celery)
Node.js + BullMQ keeps the stack entirely TypeScript. BullMQ's Redis-backed repeatable jobs with cron syntax cover both the 10-minute scrape interval and the 7am/6pm digest schedule. Each job type runs in a separate Worker with independent concurrency settings.

## Deduplication Strategy
Two-layer dedup:
1. **Content hash**: SHA-256 of `normalize(title + url + body[:500])` — catches identical articles
2. **DB unique constraint** on `Article.contentHash` — idempotent scraper runs can't create duplicates

We deliberately do NOT do fuzzy title matching at ingest time to avoid false negatives (blocking genuinely similar but distinct articles). The content hash approach handles cross-source syndication.

## Ticker Detection: Three-Pass Approach
1. `$SYMBOL` prefix → confidence 1.0 (explicit financial notation)
2. Bare uppercase word `SYMBOL` with word boundaries → confidence 0.85
3. Company name alias (≥5 chars) → confidence 0.7

A blocklist of 100+ common English words (ON, IT, ALL, etc.) prevents false positives. Single-letter tickers (A, V) require the `$` prefix to avoid noise.

## AI Model Selection
- **Claude Haiku** for 95%+ of articles (fast, cheap at $0.80/1M input tokens)
- **Claude Sonnet** for BREAKING-tagged articles only (better reasoning for high-stakes content)
- Daily spend cap enforced via `AiSpendLog` table, checked before each API call

## Free Tier News Delay
Free users see news that is ≥24 hours old. This is enforced in the alert worker (before sending instant alerts) and should also be enforced in the feed API (add `publishedAt` filter when tier === FREE). This is the primary conversion lever toward paid plans.

## Stripe Webhook Idempotency
All Stripe and Clerk webhooks are stored in `WebhookEvent` with the provider's event ID as primary key. Before processing, we check `processedAt IS NOT NULL` and skip if already handled. This makes webhook handlers safely re-runnable under at-least-once delivery.

## News Sources Prioritization
Official APIs (Alpha Vantage, Finnhub, CoinGecko) are preferred over RSS scraping because they:
- Provide structured ticker metadata
- Have explicit API ToS that allow commercial use
- Include sentiment signals (AV) or currency tags (CoinGecko)

RSS feeds (Yahoo Finance, CoinDesk, Decrypt) supplement coverage for broader market narratives.

## Monorepo Structure
Turborepo was chosen over Nx for its simpler configuration and faster remote caching setup. Packages are internal (`private: true`) and referenced via workspace symlinks (`"*"` version range). Each app has its own tsconfig extending `tsconfig.base.json`.

## Database: PostgreSQL via Prisma
Prisma was chosen over Drizzle for its more mature ecosystem, type-safe query builder, and built-in migration workflow. The `directUrl` field is set for direct connection (bypassing connection pooler) needed for migrations in environments like Railway.

## Redis Usage
Redis is used for two purposes:
1. **BullMQ job queues** — requires `maxRetriesPerRequest: null` connection option
2. **API response caching** — ticker metadata and news feeds cached for 5-60 minutes to reduce DB load

Two separate ioredis connections are maintained because BullMQ and general caching have different connection lifecycle requirements.
