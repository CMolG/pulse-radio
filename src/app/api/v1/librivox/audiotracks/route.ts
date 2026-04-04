/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import {
  NextRequest,
  NextResponse,
} from 'next/server';
import { cacheResolve } from '@/logic/services/cache-repository';
import { rateLimit, RATE_LIMITS } from '@/logic/rate-limiter';
import { sanitizeForLog } from '@/logic/sanitize';
import { logRequest } from '@/logic/logger';
import { validateRequest } from '@/logic/validate-request';
import { librivoxAudiotracksSchema } from '@/logic/validation-schemas';
import { createCircuitBreaker } from '@/logic/circuit-breaker';
import { fetchWithRetry } from '@/logic/fetch-with-retry';
import { apiError } from '@/logic/api-response';
import { readJsonWithLimit } from '@/logic/fetch-utils';
import { librivoxAudiotracksKey } from '@/logic/cache-keys';
import { withApiVersion } from '@/logic/api-versioning';
import { normalizeTracks } from '@/logic/librivox-api';
export const runtime = 'nodejs';
const _CACHE_HDRS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const librivoxCircuit = createCircuitBreaker('librivox-audiotracks');

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.librivox);
  if (limited) return limited;
  const reqLog = logRequest(req);

  const validated = validateRequest(librivoxAudiotracksSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;

  const { project_id } = validated.data;
  const cacheKey = librivoxAudiotracksKey(project_id);
  const params: Record<string, string> = {
    format: 'json',
    project_id,
  };

  try {
    const data = await cacheResolve({
      namespace: 'librivox',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const { data } = await librivoxCircuit.call(
          async () => {
            const url = `https://librivox.org/api/feed/audiotracks?${new URLSearchParams(params)}`;
            const res = await fetchWithRetry(url, {
              timeout: 10000,
              retries: 2,
              retryOn: (status, error) => {
                if (error?.name === 'AbortError') return true;
                return status ? status >= 500 : false;
              },
            });
            if (!res.ok) {
              throw new Error(`LibriVox API returned ${res.status}`);
            }
            return await readJsonWithLimit<unknown>(res, 2 * 1024 * 1024, url);
          },
          { sections: [] },
        );
        return data;
      },
    });
    const tracks = normalizeTracks(data);
    reqLog.done(200);
    const headers: Record<string, string> = { ..._CACHE_HDRS };
    if (librivoxCircuit.state !== 'CLOSED')
      headers['X-Circuit-State'] = librivoxCircuit.state.toLowerCase();
    return withApiVersion(NextResponse.json({ tracks }, { headers }));
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    const status = isTimeout ? 504 : 500;
    reqLog.done(status);
    if (!isTimeout)
      console.error(
        '[librivox] Audiotracks request failed:',
        sanitizeForLog(e instanceof Error ? e.message : String(e)),
      );
    return apiError(
      isTimeout ? 'Request timed out' : 'Audiotracks request failed',
      isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      status,
    );
  }
}
