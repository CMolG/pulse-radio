import { NextResponse } from 'next/server';

/** Strip HTML tags and decode common entities. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Fetch with an AbortController timeout, optional !ok and content-length guards. */
export async function apiFetch(
  url: string,
  opts: { timeoutMs: number; maxBytes?: number; init?: RequestInit; label?: string },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, { ...opts.init, signal: controller.signal });
    if (!res.ok) {
      await res.text().catch(() => {});
      throw new ApiError(`${opts.label ?? 'Upstream'} returned ${res.status}`, 502);
    }
    if (opts.maxBytes) {
      const cl = res.headers.get('content-length');
      if (cl && parseInt(cl, 10) > opts.maxBytes) {
        await res.body?.cancel().catch(() => {});
        throw new ApiError('Response too large', 502);
      }
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Convert a caught error into a NextResponse (timeout → 504, ApiError → its status, else fallbackStatus). */
export function apiCatchResponse(err: unknown, fallbackStatus = 502): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const isTimeout = err instanceof DOMException && err.name === 'AbortError';
  if (isTimeout) {
    return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return NextResponse.json({ error: msg }, { status: fallbackStatus });
}
