import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Aggregator — Real-Time Stock & Crypto News", template: "%s | Aggregator" },
  description:
    "AI-powered news aggregator for stocks and cryptocurrencies. Real-time alerts, sentiment analysis, and personalized watchlists.",
  keywords: ["stock news", "crypto news", "market alerts", "AI analysis", "financial news"],
  openGraph: {
    type: "website",
    siteName: "Aggregator",
    title: "Aggregator — Real-Time Stock & Crypto News",
    description: "AI-powered financial news with real-time alerts",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-white text-gray-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
