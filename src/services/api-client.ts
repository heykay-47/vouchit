export type ApiEnvelope<T> = {
  data: T | null;
  error: { message: string } | null;
};

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const apiRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const hasJsonBody = init.body !== undefined && !(init.body instanceof FormData);

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || envelope.error) {
    throw new ApiClientError(envelope.error?.message ?? 'Request failed', response.status);
  }

  return envelope.data as T;
};
