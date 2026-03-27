/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const newPath = request.nextUrl.pathname.replace('/api/', '/api/v1/') + request.nextUrl.search;
  return NextResponse.redirect(new URL(newPath, request.url), { status: 301 });
}
