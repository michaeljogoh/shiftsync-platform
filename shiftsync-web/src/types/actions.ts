export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      errors?: Record<string, string[]>;
      details?: unknown;
      suggestions?: unknown[];
    };

