/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { withApiVersion } from '@/lib/api-versioning';

const RADIO_BROWSER_STATS = 'https://de1.api.radio-browser.info/json/stats';
const DEEP_TIMEOUT_MS = 3_000;

export async function GET(request: NextRequest) {
  const deep = request.nextUrl.searchParams.get('deep') === 'true';

  const base = {
    status: 'healthy' as 'healthy' | 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: env.APP_VERSION,
  };

  if (!deep) {
    return withApiVersion(NextResponse.json(base, { status: 200 }));
  }

  let database: string;
  try {
    db.run(sql`SELECT 1`);
    database = 'ok';
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'unknown';
    database = process.env.NODE_ENV === 'production' ? 'error' : `error: ${errorMsg}`;
  }

  let radioBrowser: string;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEEP_TIMEOUT_MS);
    const res = await fetch(RADIO_BROWSER_STATS, { signal: ctrl.signal });
    clearTimeout(timer);
    radioBrowser = res.ok ? 'ok' : 'unreachable';
  } catch {
    radioBrowser = 'unreachable';
  }

  const degraded = database !== 'ok' || radioBrowser !== 'ok';

  return withApiVersion(NextResponse.json(
    {
      ...base,
      status: degraded ? 'degraded' : 'healthy',
      checks: { database, radioBrowser },
    },
    { status: 200 },
  ));
}
