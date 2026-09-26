// Shared by the browser client and the server helper: query building and the error envelope.

export type QueryValue = string | number | boolean | null | undefined | ReadonlyArray<string | number>;
export type Query = Record<string, QueryValue>;

/** A failed API call, carrying the backend's {"error": {code, message}} envelope. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** `{a: 1, tags: ["x", "y"], empty: undefined}` → `?a=1&tags=x&tags=y` (FastAPI's list format). */
export function toQueryString(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)));
    else params.append(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    let message = error?.message ?? "Something went wrong. Please try again.";
    
    // 502/503/504 from the proxy often means Render is waking the free instance up.
    if ([502, 503, 504].includes(response.status)) {
      message = "The demo server is waking up. This takes about a minute—please try again!";
    }

    throw new ApiError(
      response.status,
      error?.code ?? "http_error",
      message,
      error?.details,
    );
  }
  return body as T;
}
