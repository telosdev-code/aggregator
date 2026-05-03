import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
              <span>📈</span> Aggregator
            </Link>
            <p className="mt-2 text-sm text-gray-500">
              AI-powered market news for stocks and crypto.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li><Link href="/news" className="hover:text-gray-900">News Feed</Link></li>
                <li><Link href="/#pricing" className="hover:text-gray-900">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li><Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-gray-900">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Aggregator. Not financial advice. For informational purposes only.
        </div>
      </div>
    </footer>
  );
}
