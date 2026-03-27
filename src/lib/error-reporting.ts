type ErrorCategory = 'network' | 'audio' | 'client' | 'api';

interface ErrorReport {
  type: ErrorCategory;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  fingerprint: string;
  timestamp: number;
}

const MAX_REPORTS_PER_MINUTE = 10;
const DEDUP_WINDOW_MS = 60_000;

let reportCount = 0;
let windowStart = Date.now();
const seenFingerprints = new Map<string, number>();

function generateFingerprint(message: string, stack?: string): string {
  const key = `${message}::${(stack ?? '').split('\n').slice(0, 3).join('|')}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function isRateLimited(): boolean {
  const now = Date.now();
  if (now - windowStart > DEDUP_WINDOW_MS) {
    reportCount = 0;
    windowStart = now;
  }
  if (reportCount >= MAX_REPORTS_PER_MINUTE) return true;
  reportCount++;
  return false;
}

function isDuplicate(fingerprint: string): boolean {
  const now = Date.now();
  const lastSeen = seenFingerprints.get(fingerprint);
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return true;
  seenFingerprints.set(fingerprint, now);
  // Prune old fingerprints
  if (seenFingerprints.size > 100) {
    for (const [fp, ts] of seenFingerprints) {
      if (now - ts > DEDUP_WINDOW_MS) seenFingerprints.delete(fp);
    }
  }
  return false;
}

function classifyError(error: unknown): ErrorCategory {
  if (error instanceof TypeError && /fetch|network|load/i.test(String(error.message))) {
    return 'network';
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'network';
  }
  if (
    (typeof MediaError !== 'undefined' && error instanceof MediaError) ||
    (error instanceof Event && error.type === 'error')
  ) {
    return 'audio';
  }
  return 'client';
}

function getErrorContext(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  return {
    locale: localStorage.getItem('radio-locale') ?? 'en',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    url: window.location.pathname,
    online: navigator.onLine,
  };
}

function formatReport(report: ErrorReport): void {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(report));
}

export function reportError(opts: {
  type?: ErrorCategory;
  error: unknown;
  context?: Record<string, unknown>;
}): void {
  const { error, context: extraContext } = opts;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const type = opts.type ?? classifyError(error);
  const fingerprint = generateFingerprint(message, stack);

  if (isDuplicate(fingerprint)) return;
  if (isRateLimited()) return;

  const report: ErrorReport = {
    type,
    message,
    stack,
    context: { ...getErrorContext(), ...extraContext },
    fingerprint,
    timestamp: Date.now(),
  };

  formatReport(report);

  if (
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_ERROR_REPORTING === 'true'
  ) {
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    }).catch(() => {});
  }
}

export function reportApiError(status: number, url: string, body?: string): void {
  reportError({
    type: 'api',
    error: new Error(`API ${status}: ${url}`),
    context: { status, url, responseBody: body?.slice(0, 200) },
  });
}

export function reportAudioError(
  code: number | undefined,
  stationUrl: string,
  networkState: number | undefined,
): void {
  reportError({
    type: 'audio',
    error: new Error(`Audio error code=${code} station=${stationUrl}`),
    context: { mediaErrorCode: code, stationUrl, networkState },
  });
}

let installed = false;

export function installGlobalHandlers(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  window.addEventListener('unhandledrejection', (event) => {
    reportError({ type: 'client', error: event.reason });
  });

  window.addEventListener('error', (event) => {
    reportError({ error: event.error ?? event.message });
  });
}
