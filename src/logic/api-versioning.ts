/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextResponse } from 'next/server';

const API_VERSION = 1;

export function withApiVersion(response: NextResponse): NextResponse {
  response.headers.set('X-API-Version', String(API_VERSION));
  return response;
}
