export const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com/api/';

type ApiErrorKind = 'http' | 'network' | 'invalid-response';

interface ApiErrorOptions extends ErrorOptions {
  kind: ApiErrorKind;
  status?: number;
}

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status: number | undefined;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status;
  }
}

interface GetOptions {
  query?: Record<string, string>;
  signal?: AbortSignal;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function getErrorMessage(body: unknown, status: number): string {
  return typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string' &&
    body.error.trim().length > 0
    ? body.error
    : `The request failed (HTTP ${status}). Please try again.`;
}

async function requestJson<T>(
  path: string,
  options: GetOptions,
  body?: Record<string, string>,
): Promise<T> {
  const { query, signal } = options;
  const url = new URL(path, API_BASE_URL);

  if (query) url.search = new URLSearchParams(query).toString();

  let response: Response;

  try {
    response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) },
      ...(body && { body: JSON.stringify(body) }),
      credentials: 'omit',
      signal,
    });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error;

    throw new ApiError('Unable to reach the server. Check your connection and try again.', {
      kind: 'network',
      cause: error,
    });
  }

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) throw error;
      // A proxy can return HTML or an empty body; keep the original HTTP status.
    }

    throw new ApiError(getErrorMessage(body, response.status), {
      kind: 'http',
      status: response.status,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error;

    throw new ApiError('The server returned unreadable data. Please try again.', {
      kind: 'invalid-response',
      status: response.status,
      cause: error,
    });
  }
}

export function getJson<T>(path: string, options: GetOptions = {}): Promise<T> {
  return requestJson<T>(path, options);
}

export function postJson<T>(
  path: string,
  body: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  return requestJson<T>(path, { signal }, body);
}
