"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js App Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090B] text-white p-6">
      <h2 className="text-xl font-bold text-red-400">Studio Runtime Error</h2>
      <p className="text-sm text-zinc-400 mt-2 max-w-md text-center">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-white text-black font-bold rounded-md text-xs uppercase"
      >
        Try Again
      </button>
    </div>
  );
}
