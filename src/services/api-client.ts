export type ApiEnvelope<T> = {
  data: T | null;
  error: { message: string; details?: Record<string, unknown> } | null;
};

export class ApiClientError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
  options: { suppressAuthEvent?: boolean } = {},
): Promise<T> => {
  const hasJsonBody = init.body !== undefined && !(init.body instanceof FormData);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError('Request timed out', 408);
    }
    throw new ApiClientError('Network error', 0);
  }
  clearTimeout(timeout);

  if (response.status === 401 && !options.suppressAuthEvent) {
    window.dispatchEvent(new CustomEvent('auth:401'));
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError(`Request failed (${response.status})`, response.status);
  }

  if (!response.ok || envelope.error) {
    throw new ApiClientError(
      envelope.error?.message ?? 'Request failed',
      response.status,
      envelope.error?.details,
    );
  }

  return envelope.data as T;
};
