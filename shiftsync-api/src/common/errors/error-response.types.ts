/**
 * Standard API error response shape (Section 10 – Error handling).
 * All error responses use this structure for consistent client handling.
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, unknown> | unknown[];
  suggestions?: Array<{ userId: string; name: string; reason: string }>;
  timestamp: string;
  path: string;
}

function defaultErrorForStatus(status: number): string {
  const map: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
  };
  return map[status] ?? 'Error';
}

export function normalizeMessage(
  message: string | string[] | undefined,
): string {
  if (message == null) return 'An error occurred';
  if (Array.isArray(message)) return message.join('; ');
  return String(message);
}

export function buildErrorResponse(
  statusCode: number,
  message: string,
  options: {
    error?: string;
    details?: Record<string, unknown> | unknown[];
    suggestions?: Array<{ userId: string; name: string; reason: string }>;
    path: string;
  },
): ErrorResponse {
  return {
    statusCode,
    error: options.error ?? defaultErrorForStatus(statusCode),
    message,
    ...(options.details != null && { details: options.details }),
    ...(options.suggestions != null && options.suggestions.length > 0 && { suggestions: options.suggestions }),
    timestamp: new Date().toISOString(),
    path: options.path,
  };
}
