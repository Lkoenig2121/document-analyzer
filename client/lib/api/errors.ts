export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: ApiErrorResponse } }).response;
    const message = response?.data?.error?.message;

    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
