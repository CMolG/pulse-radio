/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextResponse } from 'next/server';

/**
 * Standard machine-readable error codes for all API routes.
 *
 * - INVALID_PARAM  — A parameter failed validation or is malformed.
 * - MISSING_PARAM  — A required parameter was not provided.
 * - TIMEOUT        — The upstream request or internal operation timed out.
 * - UPSTREAM_ERROR — An upstream service returned a non-OK status.
 * - RATE_LIMITED   — The caller exceeded the rate limit.
 * - BLACKLISTED    — The resource is temporarily blocked (e.g. failing station).
 * - NOT_FOUND      — The requested resource does not exist.
 * - INTERNAL_ERROR — An unexpected server-side error occurred.
 */
export type ApiErrorCode =
  | 'INVALID_PARAM'
  | 'MISSING_PARAM'
  | 'TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'RATE_LIMITED'
  | 'BLACKLISTED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  status: number;
}

/** Create a standardized JSON error response. */
export function apiError(
  message: string,
  code: ApiErrorCode,
  status: number,
  headers?: HeadersInit,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: message, code, status } satisfies ApiErrorResponse,
    { status, headers },
  );
}

/** Create a standardized JSON success response. */
export function apiSuccess<T>(data: T, headers?: HeadersInit): NextResponse<T> {
  return NextResponse.json(data, { headers });
}
