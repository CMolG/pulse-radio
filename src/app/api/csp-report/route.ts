import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/logic/rate-limiter';
import { logger } from '@/logic/logger';

const CSP_RATE_LIMIT = { limit: 100, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, CSP_RATE_LIMIT);
  if (limited) return limited;

  try {
    const body = await req.json();
    const report = body['csp-report'] ?? body;

    logger.warn('CSP violation', {
      blockedUri: report['blocked-uri'] ?? report.blockedURL ?? 'unknown',
      violatedDirective:
        report['violated-directive'] ??
        report.effectiveDirective ??
        'unknown',
      documentUri: report['document-uri'] ?? report.documentURL ?? 'unknown',
      sourceFile: report['source-file'] ?? report.sourceFile ?? undefined,
      lineNumber: report['line-number'] ?? report.lineNumber ?? undefined,
      originalPolicy:
        report['original-policy'] ?? report.originalPolicy ?? undefined,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}
