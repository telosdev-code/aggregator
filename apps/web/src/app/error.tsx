"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <p className="text-6xl font-bold text-gray-200">500</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-500">
        {error.digest ? `Error ID: ${error.digest}` : "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
