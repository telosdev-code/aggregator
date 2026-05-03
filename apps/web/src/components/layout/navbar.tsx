import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <span className="text-xl">📈</span>
          <span>Aggregator</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/news" className="text-gray-600 hover:text-gray-900 transition-colors">News</Link>
          <Link href="/ticker/AAPL" className="text-gray-600 hover:text-gray-900 transition-colors">Stocks</Link>
          <Link href="/ticker/BTC" className="text-gray-600 hover:text-gray-900 transition-colors">Crypto</Link>
          <Link href="/#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-3">
          <SignedOut>
            <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}
