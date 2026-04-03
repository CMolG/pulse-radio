/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import Radio from '@/components/radio';
export default function Home() {
  return (
    <div className="h-full w-full relative">
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center bg-[#0a0f1a]">
        <h1 className="text-4xl font-bold mb-4 text-white">Pulse Radio — Free Internet Radio</h1>
        <p className="text-white/70 max-w-2xl text-lg leading-relaxed mb-4">
          Stream thousands of free internet radio stations from around the world. Enjoy a real-time
          audio visualizer, album art, song history, favorites, and theater mode — no sign-up
          required.
        </p>
        <p className="text-white/50 max-w-xl text-sm leading-relaxed">
          Discover stations by country, genre, or language. Save your favorites and pick up right
          where you left off.
        </p>
      </div>
      <div className="relative z-10 h-full">
        <Radio />
      </div>
    </div>
  );
}
