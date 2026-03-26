/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import Link from 'next/link';
export default function CountryNotFound() {
  return (
    <main className="h-full min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center px-6">
      {' '}
      <div className="max-w-lg w-full rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
        {' '}
        <h1 className="text-2xl font-semibold mb-3">Country page not found</h1>{' '}
        <p className="text-white/70 mb-6">
          This country code does not exist in Pulse Radio sovereign pages.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-white/10 hover:bg-white/15 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
        >
          Go back home
        </Link>
      </div>
    </main>
  );
}
