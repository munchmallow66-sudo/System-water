import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message, details },
    { status }
  );
}

export function apiUnauthorized(message = 'Unauthorized'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

export function apiForbidden(message = 'Forbidden'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

export function apiNotFound(message = 'Not found'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

export function apiValidationError(error: ZodError): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation error',
      details: error.issues,
    },
    { status: 400 }
  );
}

export function apiServerError(message = 'Internal server error'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  );
}

export function apiPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// Helper to extract client IP
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return null;
}

// Helper to parse JSON body safely
export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
