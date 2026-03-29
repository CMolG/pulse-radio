import { isEnabled } from '@/logic/feature-flags';

type AnalyticsEvent =
  | 'station_play'
  | 'station_stop'
  | 'search'
  | 'favorite_add'
  | 'favorite_remove'
  | 'page_view';

interface EventEntry {
  event: AnalyticsEvent;
  properties?: Record<string, string>;
}

const BATCH_INTERVAL = 10_000; // 10 seconds
const queue: EventEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function shouldTrack(): boolean {
  if (!isEnabled('analytics')) return false;
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return false;
  return true;
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await fetch('/api/v1/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
  } catch {
    // Fail silently — never block UI for analytics
  }
}

/** Track an analytics event. Batches events and sends every 10 seconds. */
export function track(event: AnalyticsEvent, properties?: Record<string, string>) {
  if (!shouldTrack()) return;

  queue.push({ event, properties });

  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, BATCH_INTERVAL);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
