import { Resend } from "resend";
import type { Sentiment } from "@aggregator/shared";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM = `${process.env.EMAIL_FROM_NAME ?? "Aggregator"} <${process.env.EMAIL_FROM ?? "alerts@yourdomain.com"}>`;

interface ArticleSnippet {
  title: string;
  url: string;
  sourceName: string;
  publishedAt?: Date;
  summary: string;
  sentiment: Sentiment;
  tickers: string[];
}

export async function sendAlertEmail(opts: {
  to: string;
  name?: string;
  article: ArticleSnippet;
}): Promise<void> {
  const sentimentEmoji = { BULLISH: "🟢", BEARISH: "🔴", NEUTRAL: "⚪" }[opts.article.sentiment];
  const tickerBadges = opts.article.tickers.map((t) => `$${t}`).join(" ");

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${sentimentEmoji} Alert: ${opts.article.title.slice(0, 80)}`,
    html: alertEmailHtml({
      name: opts.name,
      article: opts.article,
      sentimentEmoji,
      tickerBadges,
    }),
    text: `${sentimentEmoji} ${opts.article.title}\n\n${opts.article.summary}\n\nTickers: ${tickerBadges}\nSource: ${opts.article.sourceName}\n\nRead more: ${opts.article.url}\n\n---\nNot financial advice. Manage alerts: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });
}

export async function sendDigestEmail(opts: {
  to: string;
  name?: string;
  type: "daily_morning" | "daily_evening";
  articles: ArticleSnippet[];
}): Promise<void> {
  const label = opts.type === "daily_morning" ? "Morning" : "Evening";
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `📰 Your ${label} Market Digest — ${date}`,
    html: digestEmailHtml({ name: opts.name, type: opts.type, articles: opts.articles, date }),
    text: digestEmailText(opts),
  });
}

function alertEmailHtml(opts: {
  name?: string;
  article: ArticleSnippet;
  sentimentEmoji: string;
  tickerBadges: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;background:#fff">
  <div style="border-bottom:2px solid #e5e7eb;padding-bottom:12px;margin-bottom:20px">
    <a href="${appUrl}" style="text-decoration:none;color:#1a1a1a;font-weight:700;font-size:18px">📈 Aggregator</a>
  </div>
  ${opts.name ? `<p style="color:#6b7280">Hi ${opts.name},</p>` : ""}
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="font-size:12px;color:#6b7280;margin-bottom:6px">${opts.article.sourceName} • ${opts.sentimentEmoji} ${opts.article.sentiment}</div>
    <h2 style="margin:0 0 10px;font-size:18px;line-height:1.4">
      <a href="${opts.article.url}" style="color:#111827;text-decoration:none">${opts.article.title}</a>
    </h2>
    <p style="margin:0 0 12px;color:#374151;line-height:1.6">${opts.article.summary}</p>
    <div style="margin-bottom:12px">
      ${opts.article.tickers.map((t) => `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;margin-right:4px">$${t}</span>`).join("")}
    </div>
    <a href="${opts.article.url}" style="display:inline-block;background:#2563eb;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Read Article →</a>
  </div>
  <p style="font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px">
    Not financial advice. <a href="${appUrl}/dashboard" style="color:#6b7280">Manage alerts</a>
  </p>
</body>
</html>`;
}

function digestEmailHtml(opts: {
  name?: string;
  type: string;
  articles: ArticleSnippet[];
  date: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  const label = opts.type === "daily_morning" ? "Morning" : "Evening";
  const articles = opts.articles
    .map((a) => {
      const emoji = { BULLISH: "🟢", BEARISH: "🔴", NEUTRAL: "⚪" }[a.sentiment];
      return `
    <div style="border-bottom:1px solid #e5e7eb;padding:16px 0">
      <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${a.sourceName} ${emoji}</div>
      <h3 style="margin:0 0 8px;font-size:16px">
        <a href="${a.url}" style="color:#111827;text-decoration:none">${a.title}</a>
      </h3>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.5">${a.summary}</p>
      <div>${a.tickers.map((t) => `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:600;margin-right:3px">$${t}</span>`).join("")}</div>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;background:#fff">
  <div style="border-bottom:2px solid #e5e7eb;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
    <a href="${appUrl}" style="text-decoration:none;color:#1a1a1a;font-weight:700;font-size:18px">📈 Aggregator</a>
    <span style="font-size:13px;color:#6b7280">${label} Digest • ${opts.date}</span>
  </div>
  ${opts.name ? `<p style="color:#6b7280;margin-bottom:16px">Hi ${opts.name}, here's what's happening in your watchlist:</p>` : ""}
  ${articles}
  <div style="margin-top:20px;text-align:center">
    <a href="${appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600">View Full Dashboard →</a>
  </div>
  <p style="font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:20px">
    Not financial advice. <a href="${appUrl}/dashboard/settings" style="color:#6b7280">Unsubscribe or manage preferences</a>
  </p>
</body>
</html>`;
}

function digestEmailText(opts: { name?: string; type: string; articles: ArticleSnippet[] }): string {
  const label = opts.type === "daily_morning" ? "Morning" : "Evening";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  const lines = [
    `Your ${label} Market Digest`,
    opts.name ? `Hi ${opts.name},` : "",
    "",
    ...opts.articles.flatMap((a) => [
      `• ${a.title}`,
      `  ${a.summary}`,
      `  Tickers: ${a.tickers.map((t) => `$${t}`).join(", ")}`,
      `  ${a.url}`,
      "",
    ]),
    `---`,
    `Not financial advice. Manage preferences: ${appUrl}/dashboard/settings`,
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}
