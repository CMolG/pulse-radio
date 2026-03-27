/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextResponse } from 'next/server';
import { type ZodObject, type ZodRawShape, type z } from 'zod';

type ValidationSuccess<T> = { success: true; data: T };
type ValidationFailure = { success: false; error: NextResponse };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate URLSearchParams against a Zod schema.
 * Returns parsed data on success, or a 400 NextResponse on failure.
 */
export function validateRequest<T extends ZodRawShape>(
  schema: ZodObject<T>,
  searchParams: URLSearchParams,
): ValidationResult<z.infer<ZodObject<T>>> {
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    raw[key] = value;
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: result.data };
}
