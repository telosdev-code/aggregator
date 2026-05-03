"use client";

const DEMO_TICKERS = [
  { symbol: "AAPL", change: "+1.24%" },
  { symbol: "MSFT", change: "+0.87%" },
  { symbol: "NVDA", change: "+3.41%" },
  { symbol: "TSLA", change: "-1.05%" },
  { symbol: "AMZN", change: "+0.33%" },
  { symbol: "BTC", change: "+2.18%" },
  { symbol: "ETH", change: "+1.76%" },
  { symbol: "SOL", change: "+4.92%" },
  { symbol: "META", change: "+1.15%" },
  { symbol: "GOOGL", change: "-0.42%" },
  { symbol: "AAPL", change: "+1.24%" },
  { symbol: "MSFT", change: "+0.87%" },
  { symbol: "NVDA", change: "+3.41%" },
  { symbol: "TSLA", change: "-1.05%" },
];

export function TickerTape() {
  return (
    <div className="overflow-hidden border-t border-white/10 bg-black/20 py-2">
      <div className="flex animate-marquee gap-8 whitespace-nowrap">
        {DEMO_TICKERS.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs font-mono">
            <span className="font-semibold text-white">{t.symbol}</span>
            <span className={t.change.startsWith("+") ? "text-green-400" : "text-red-400"}>
              {t.change}
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .animate-marquee { animation: marquee 30s linear infinite; }
      `}</style>
    </div>
  );
}
