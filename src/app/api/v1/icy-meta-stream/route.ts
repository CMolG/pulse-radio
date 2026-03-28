import { NextRequest } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/logic/rate-limiter';
import { sanitizeUrl } from '@/logic/sanitize';
import { logRequest } from '@/logic/logger';
import { withApiVersion } from '@/logic/api-versioning';

export const runtime = 'nodejs';

const MAX_SSE_DURATION = 5 * 60 * 1000;
const POLL_INTERVAL = 10_000;
const HEARTBEAT_INTERVAL = 30_000;

const STREAM_TITLE_RE = /StreamTitle='([^']*)'/;
const UTF8_DECODER = new TextDecoder('utf-8');
const ICY_FETCH_HDRS = { 'Icy-MetaData': '1' } as const;

async function fetchIcyTitle(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: ICY_FETCH_HDRS,
      signal: controller.signal,
      redirect: 'follow',
    });
    const metaInt = parseInt(res.headers.get('icy-metaint') || '', 10);
    if (!metaInt || isNaN(metaInt) || !res.body) return null;

    const reader = res.body.getReader();
    let read = 0;
    const chunks: Uint8Array[] = [];
    while (read < metaInt + 4096) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      read += value.length;
    }
    reader.cancel().catch(() => {});

    const buf = new Uint8Array(read);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.length;
    }

    if (buf.length <= metaInt) return null;
    const metaLen = buf[metaInt] * 16;
    if (metaLen === 0 || buf.length < metaInt + 1 + metaLen) return null;

    const metaStr = UTF8_DECODER.decode(buf.subarray(metaInt + 1, metaInt + 1 + metaLen)).replace(
      /\0+$/,
      '',
    );
    const match = metaStr.match(STREAM_TITLE_RE);
    return match?.[1] || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  logRequest(req, 'icy-meta-stream');

  const limited = rateLimit(req, RATE_LIMITS.icyMeta);
  if (limited) return limited;

  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const url = sanitizeUrl(rawUrl);
  if (!url) {
    return new Response('Invalid url', { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastTitle = '';
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendHeartbeat = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      };

      const maxTimer = setTimeout(() => {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      }, MAX_SSE_DURATION);

      const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

      const pollTimer = setInterval(async () => {
        if (closed) return;
        try {
          const title = await fetchIcyTitle(url);
          if (title && title !== lastTitle) {
            lastTitle = title;
            sendEvent(JSON.stringify({ title }));
          }
        } catch { /* continue polling */ }
      }, POLL_INTERVAL);

      // Initial fetch
      try {
        const title = await fetchIcyTitle(url);
        if (title) {
          lastTitle = title;
          sendEvent(JSON.stringify({ title }));
        }
      } catch { /* continue */ }

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearTimeout(maxTimer);
        clearInterval(heartbeatTimer);
        clearInterval(pollTimer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
